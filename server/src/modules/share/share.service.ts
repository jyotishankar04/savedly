import crypto from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import {
  collectionMemories,
  collections,
  memories,
  shareAccessRequests,
  shareGrants,
  shares,
  users,
} from "../../db/schema";
import {
  ShareAccessRequestStatus,
  ShareGrantSource,
  ShareGrantStatus,
  ShareLinkAccess,
  ShareResourceType,
  PlanLimitType,
} from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword as hashSharePassword } from "../../shared/crypto/scrypt-password";
import { notifyAccessDecision, notifyAccessRequested, notifyShareInvite } from "./share.notify";
import type { ShareRow } from "./share.access";
import type { CreateShareInput, ListSharesQuery, UpdateShareInput } from "./share.schema";
import { assertFeature, assertWithinLimit } from "../plans/plans.service";

// A denied request shouldn't be re-openable immediately — the partial
// unique index only stops duplicate *pending* rows.
const DENIED_REQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** 96 bits — same generator the old collections.publicSlug used. */
function generateShareSlug(): string {
  return crypto.randomBytes(12).toString("base64url");
}

export interface ShareResponse {
  id: string;
  resourceType: ShareResourceType;
  resourceId: string;
  slug: string;
  linkAccess: ShareLinkAccess;
  hasPassword: boolean;
  allowSearchIndexing: boolean;
  expiresAt: Date | null;
  viewCount: number;
  grantCount: number;
  pendingRequestCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(share: ShareRow, grantCount = 0, pendingRequestCount = 0): ShareResponse {
  return {
    id: share.id,
    resourceType: share.resourceType as ShareResourceType,
    resourceId: (share.collectionId ?? share.memoryId)!,
    slug: share.slug,
    linkAccess: share.linkAccess as ShareLinkAccess,
    // Never return the hash itself, only whether one is set.
    hasPassword: Boolean(share.passwordHash),
    allowSearchIndexing: share.allowSearchIndexing,
    expiresAt: share.expiresAt,
    viewCount: share.viewCount,
    grantCount,
    pendingRequestCount,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

/**
 * Confirms the caller owns the thing they're trying to share. Scoped by
 * userId in the WHERE rather than loaded-then-checked, so a resource
 * belonging to someone else is indistinguishable from one that doesn't
 * exist.
 */
async function assertOwnsResource(
  userId: string,
  resourceType: ShareResourceType,
  resourceId: string,
  dbClient: DbOrTx = db
): Promise<void> {
  if (resourceType === ShareResourceType.COLLECTION) {
    const [row] = await dbClient
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, resourceId), eq(collections.userId, userId)))
      .limit(1);
    if (!row) throw new AppError("Collection not found", 404, "NOT_FOUND");
    return;
  }

  const [row] = await dbClient
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.id, resourceId), eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)))
    .limit(1);
  if (!row) throw new AppError("Memory not found", 404, "NOT_FOUND");
}

/** Loads a share the caller owns, or 404s. The one authorization gate for every owner-side call. */
async function loadOwnedShare(userId: string, shareId: string, dbClient: DbOrTx = db): Promise<ShareRow> {
  const [row] = await dbClient
    .select()
    .from(shares)
    .where(and(eq(shares.id, shareId), eq(shares.ownerId, userId)))
    .limit(1);

  if (!row) throw new AppError("Share not found", 404, "NOT_FOUND");
  return row;
}

function resourceColumn(resourceType: ShareResourceType, resourceId: string) {
  return resourceType === ShareResourceType.COLLECTION
    ? { collectionId: resourceId, memoryId: null }
    : { collectionId: null, memoryId: resourceId };
}

export async function getShareForResource(
  userId: string,
  resourceType: ShareResourceType,
  resourceId: string
): Promise<ShareResponse | null> {
  await assertOwnsResource(userId, resourceType, resourceId);

  const column = resourceType === ShareResourceType.COLLECTION ? shares.collectionId : shares.memoryId;
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.ownerId, userId), eq(column, resourceId)))
    .limit(1);

  if (!row) return null;
  return toResponse(row, ...(await countsFor(row.id)));
}

async function countsFor(shareId: string): Promise<[number, number]> {
  const [grants] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(shareGrants)
    .where(and(eq(shareGrants.shareId, shareId), eq(shareGrants.status, ShareGrantStatus.ACTIVE)));

  const [requests] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(shareAccessRequests)
    .where(
      and(eq(shareAccessRequests.shareId, shareId), eq(shareAccessRequests.status, ShareAccessRequestStatus.PENDING))
    );

  return [grants?.value ?? 0, requests?.value ?? 0];
}

/**
 * Idempotent: the partial unique indexes on (collection_id) / (memory_id)
 * guarantee one share row per resource, so a double-click can't mint two
 * slugs for the same thing. New shares start DISABLED — creating a share
 * is not the same as publishing it.
 */
export async function getOrCreateShare(userId: string, input: CreateShareInput): Promise<ShareResponse> {
  const { resourceType, resourceId } = input;
  await assertOwnsResource(userId, resourceType, resourceId);

  const existing = await getShareForResource(userId, resourceType, resourceId);
  if (existing) return existing;

  const [row] = await db
    .insert(shares)
    .values({
      ownerId: userId,
      resourceType,
      ...resourceColumn(resourceType, resourceId),
      slug: generateShareSlug(),
      linkAccess: ShareLinkAccess.DISABLED,
    })
    .onConflictDoNothing()
    .returning();

  // Lost the race with a concurrent create — read the winner back.
  if (!row) {
    const settled = await getShareForResource(userId, resourceType, resourceId);
    if (!settled) throw new AppError("Could not create share", 500, "INTERNAL_ERROR");
    return settled;
  }

  return toResponse(row);
}

export async function updateShare(userId: string, shareId: string, patch: UpdateShareInput): Promise<ShareResponse> {
  const existing = await loadOwnedShare(userId, shareId);
  const nextAccess = patch.linkAccess ?? (existing.linkAccess as ShareLinkAccess);

  const updates: Partial<typeof shares.$inferInsert> = { updatedAt: new Date() };

  if (patch.linkAccess !== undefined) updates.linkAccess = patch.linkAccess;
  if (patch.allowSearchIndexing !== undefined) updates.allowSearchIndexing = patch.allowSearchIndexing;
  if (patch.expiresAt !== undefined) updates.expiresAt = patch.expiresAt;

  if (patch.password !== undefined) {
    // Bumping passwordUpdatedAt is what invalidates every unlock cookie
    // already handed out — including on clear, so removing a password
    // doesn't leave stale proofs valid if it's later set again.
    updates.passwordHash = patch.password === null ? null : await hashSharePassword(patch.password);
    updates.passwordUpdatedAt = new Date();
  }

  const willHavePassword =
    patch.password !== undefined ? patch.password !== null : Boolean(existing.passwordHash);

  if (nextAccess === ShareLinkAccess.PASSWORD && !willHavePassword) {
    throw new AppError("Set a password before switching this link to password-protected", 400, "BAD_REQUEST");
  }

  // Switching a link to a plan feature needs the plan; a link that already
  // works that way keeps working after a downgrade, and can always be made
  // public (within the public-link allowance) or turned off.
  const addsPassword =
    (nextAccess === ShareLinkAccess.PASSWORD && existing.linkAccess !== ShareLinkAccess.PASSWORD) ||
    (typeof patch.password === "string" && !existing.passwordHash);
  if (addsPassword) await assertFeature(userId, "passwordProtectedShares");
  if (nextAccess === ShareLinkAccess.REQUEST && existing.linkAccess !== ShareLinkAccess.REQUEST) {
    await assertFeature(userId, "privateShareRequests");
  }

  // Only switching a link *to* public counts against the plan's public-link
  // allowance; a link that's already public was counted when it went public.
  if (nextAccess === ShareLinkAccess.PUBLIC && existing.linkAccess !== ShareLinkAccess.PUBLIC) {
    await assertWithinLimit(userId, PlanLimitType.PUBLIC_SHARE_COUNT, 1);
  }

  const [row] = await db.update(shares).set(updates).where(eq(shares.id, shareId)).returning();
  return toResponse(row, ...(await countsFor(shareId)));
}

export async function rotateShareSlug(userId: string, shareId: string): Promise<ShareResponse> {
  await loadOwnedShare(userId, shareId);
  const [row] = await db
    .update(shares)
    .set({ slug: generateShareSlug(), updatedAt: new Date() })
    .where(eq(shares.id, shareId))
    .returning();

  return toResponse(row, ...(await countsFor(shareId)));
}

export async function deleteShare(userId: string, shareId: string): Promise<void> {
  await loadOwnedShare(userId, shareId);
  // Grants and requests cascade.
  await db.delete(shares).where(eq(shares.id, shareId));
}

export interface ShareListItem extends ShareResponse {
  resourceName: string;
}

export async function listMyShares(userId: string, query: ListSharesQuery): Promise<ShareListItem[]> {
  const rows = await db
    .select({
      share: shares,
      collectionName: collections.name,
      memoryTitle: memories.title,
      grantCount: sql<number>`(
        select count(*)::int from ${shareGrants}
        where ${shareGrants.shareId} = ${shares.id} and ${shareGrants.status} = 'active'
      )`,
      pendingRequestCount: sql<number>`(
        select count(*)::int from ${shareAccessRequests}
        where ${shareAccessRequests.shareId} = ${shares.id} and ${shareAccessRequests.status} = 'pending'
      )`,
    })
    .from(shares)
    .leftJoin(collections, eq(collections.id, shares.collectionId))
    .leftJoin(memories, eq(memories.id, shares.memoryId))
    .where(
      query.resourceType
        ? and(eq(shares.ownerId, userId), eq(shares.resourceType, query.resourceType))
        : eq(shares.ownerId, userId)
    )
    .orderBy(desc(shares.updatedAt));

  return rows.map((row) => ({
    ...toResponse(row.share, row.grantCount, row.pendingRequestCount),
    resourceName: row.collectionName ?? row.memoryTitle ?? "Untitled",
  }));
}

export interface SharedWithMeItem {
  shareId: string;
  slug: string;
  resourceType: ShareResourceType;
  resourceName: string;
  ownerName: string | null;
  sharedAt: Date;
}

export async function listSharedWithMe(userId: string): Promise<SharedWithMeItem[]> {
  const rows = await db
    .select({
      shareId: shares.id,
      slug: shares.slug,
      resourceType: shares.resourceType,
      collectionName: collections.name,
      memoryTitle: memories.title,
      ownerName: users.name,
      sharedAt: shareGrants.acceptedAt,
      createdAt: shareGrants.createdAt,
    })
    .from(shareGrants)
    .innerJoin(shares, eq(shares.id, shareGrants.shareId))
    .innerJoin(users, eq(users.id, shares.ownerId))
    .leftJoin(collections, eq(collections.id, shares.collectionId))
    .leftJoin(memories, eq(memories.id, shares.memoryId))
    .where(and(eq(shareGrants.userId, userId), eq(shareGrants.status, ShareGrantStatus.ACTIVE)))
    .orderBy(desc(shareGrants.createdAt));

  return rows.map((row) => ({
    shareId: row.shareId,
    slug: row.slug,
    resourceType: row.resourceType as ShareResourceType,
    resourceName: row.collectionName ?? row.memoryTitle ?? "Untitled",
    ownerName: row.ownerName,
    sharedAt: row.sharedAt ?? row.createdAt,
  }));
}

// -----------------------------------------------------------------------------
// Grants
// -----------------------------------------------------------------------------

export interface GrantResponse {
  id: string;
  email: string;
  userId: string | null;
  name: string | null;
  status: ShareGrantStatus;
  createdAt: Date;
}

export async function listGrants(userId: string, shareId: string): Promise<GrantResponse[]> {
  await loadOwnedShare(userId, shareId);

  const rows = await db
    .select({
      id: shareGrants.id,
      email: shareGrants.inviteeEmail,
      userId: shareGrants.userId,
      name: users.name,
      status: shareGrants.status,
      createdAt: shareGrants.createdAt,
    })
    .from(shareGrants)
    .leftJoin(users, eq(users.id, shareGrants.userId))
    .where(and(eq(shareGrants.shareId, shareId), sql`${shareGrants.status} <> 'revoked'`))
    .orderBy(desc(shareGrants.createdAt));

  return rows.map((row) => ({ ...row, status: row.status as ShareGrantStatus }));
}

/**
 * Always creates a row and always returns the same shape whether or not an
 * account exists for that address — otherwise this endpoint would be an
 * account-enumeration oracle for anyone with a share of their own.
 */
export async function inviteByEmail(userId: string, shareId: string, email: string): Promise<GrantResponse> {
  const share = await loadOwnedShare(userId, shareId);
  await assertFeature(userId, "directShares");

  const [owner] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (owner?.email.toLowerCase() === email) {
    throw new AppError("You already have access to this", 400, "BAD_REQUEST");
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  const [row] = await db
    .insert(shareGrants)
    .values({
      shareId,
      inviteeEmail: email,
      userId: existingUser?.id ?? null,
      // An existing account is granted immediately; an unknown address waits
      // for signup, where claimPendingGrantsForEmail activates it.
      status: existingUser ? ShareGrantStatus.ACTIVE : ShareGrantStatus.PENDING,
      source: ShareGrantSource.DIRECT_INVITE,
      invitedBy: userId,
      acceptedAt: existingUser ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [shareGrants.shareId, shareGrants.inviteeEmail],
      // Re-inviting someone previously revoked should restore them rather
      // than fail — that's what the owner means by typing the address again.
      set: {
        userId: existingUser?.id ?? null,
        status: existingUser ? ShareGrantStatus.ACTIVE : ShareGrantStatus.PENDING,
        acceptedAt: existingUser ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  notifyShareInvite({ granteeUserId: existingUser?.id ?? null, email, share, ownerName: owner?.name ?? null });

  return {
    id: row.id,
    email: row.inviteeEmail,
    userId: row.userId,
    name: null,
    status: row.status as ShareGrantStatus,
    createdAt: row.createdAt,
  };
}

export async function revokeGrant(userId: string, shareId: string, grantId: string): Promise<void> {
  // Ownership is enforced by joining through shares in the same statement —
  // never load-then-check.
  const [grant] = await db
    .select({ id: shareGrants.id })
    .from(shareGrants)
    .innerJoin(shares, eq(shares.id, shareGrants.shareId))
    .where(and(eq(shareGrants.id, grantId), eq(shareGrants.shareId, shareId), eq(shares.ownerId, userId)))
    .limit(1);

  if (!grant) throw new AppError("Invite not found", 404, "NOT_FOUND");

  // Kept as a revoked row, not deleted: otherwise a pending invite would
  // silently reactivate if that person signed up later.
  await db
    .update(shareGrants)
    .set({ status: ShareGrantStatus.REVOKED, updatedAt: new Date() })
    .where(eq(shareGrants.id, grantId));
}

/**
 * Called from the OAuth callback for every login, not just signup — an
 * invite that lands between account creation and this call would otherwise
 * stay pending until the next login.
 *
 * Gated on a provider-verified email: without that check, signing in with a
 * provider that doesn't verify addresses would let anyone claim invites
 * sent to someone else.
 */
export async function claimPendingGrantsForEmail(
  userId: string,
  email: string,
  emailVerified: boolean
): Promise<number> {
  if (!emailVerified) return 0;

  const claimed = await db
    .update(shareGrants)
    .set({ userId, status: ShareGrantStatus.ACTIVE, acceptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        isNull(shareGrants.userId),
        eq(shareGrants.status, ShareGrantStatus.PENDING),
        eq(shareGrants.inviteeEmail, email.toLowerCase())
      )
    )
    .returning({ id: shareGrants.id });

  return claimed.length;
}

// -----------------------------------------------------------------------------
// Access requests
// -----------------------------------------------------------------------------

export interface AccessRequestResponse {
  id: string;
  shareId: string;
  slug: string;
  resourceName: string;
  requesterName: string | null;
  requesterEmail: string;
  message: string | null;
  status: ShareAccessRequestStatus;
  createdAt: Date;
}

export async function listRequestsForOwner(userId: string, shareId?: string): Promise<AccessRequestResponse[]> {
  const scope = shareId
    ? and(eq(shares.ownerId, userId), eq(shareAccessRequests.shareId, shareId))
    : eq(shares.ownerId, userId);

  const rows = await db
    .select({
      id: shareAccessRequests.id,
      shareId: shareAccessRequests.shareId,
      slug: shares.slug,
      collectionName: collections.name,
      memoryTitle: memories.title,
      requesterName: users.name,
      requesterEmail: users.email,
      message: shareAccessRequests.message,
      status: shareAccessRequests.status,
      createdAt: shareAccessRequests.createdAt,
    })
    .from(shareAccessRequests)
    .innerJoin(shares, eq(shares.id, shareAccessRequests.shareId))
    .innerJoin(users, eq(users.id, shareAccessRequests.requesterUserId))
    .leftJoin(collections, eq(collections.id, shares.collectionId))
    .leftJoin(memories, eq(memories.id, shares.memoryId))
    .where(and(scope, eq(shareAccessRequests.status, ShareAccessRequestStatus.PENDING)))
    .orderBy(desc(shareAccessRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    shareId: row.shareId,
    slug: row.slug,
    resourceName: row.collectionName ?? row.memoryTitle ?? "Untitled",
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    message: row.message,
    status: row.status as ShareAccessRequestStatus,
    createdAt: row.createdAt,
  }));
}

export async function requestAccess(userId: string, slug: string, message?: string): Promise<{ status: string }> {
  const [share] = await db.select().from(shares).where(eq(shares.slug, slug)).limit(1);

  // Same 404 as an unknown slug — asking for access to a link that isn't in
  // request mode must not confirm the link exists.
  if (!share || share.linkAccess !== ShareLinkAccess.REQUEST) {
    throw new AppError("Not found", 404, "NOT_FOUND");
  }

  if (share.ownerId === userId) {
    throw new AppError("You already have access to this", 400, "BAD_REQUEST");
  }

  const [recentlyDenied] = await db
    .select({ id: shareAccessRequests.id })
    .from(shareAccessRequests)
    .where(
      and(
        eq(shareAccessRequests.shareId, share.id),
        eq(shareAccessRequests.requesterUserId, userId),
        eq(shareAccessRequests.status, ShareAccessRequestStatus.DENIED),
        gt(shareAccessRequests.decidedAt, new Date(Date.now() - DENIED_REQUEST_COOLDOWN_MS))
      )
    )
    .limit(1);

  if (recentlyDenied) {
    throw new AppError("Your previous request was declined", 403, "SHARE_ACCESS_DENIED");
  }

  // Idempotent: the partial unique index allows only one pending row, so a
  // repeated click reports the existing request rather than erroring.
  const [row] = await db
    .insert(shareAccessRequests)
    .values({ shareId: share.id, requesterUserId: userId, message: message ?? null })
    .onConflictDoNothing()
    .returning();

  if (row) {
    const [requester] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, share.ownerId)).limit(1);
    notifyAccessRequested({
      ownerId: share.ownerId,
      ownerEmail: owner?.email ?? "",
      requesterName: requester?.name ?? null,
      share,
      requestId: row.id,
    });
  }

  return { status: "pending" };
}

export async function cancelAccessRequest(userId: string, slug: string): Promise<void> {
  const [share] = await db.select({ id: shares.id }).from(shares).where(eq(shares.slug, slug)).limit(1);
  if (!share) throw new AppError("Not found", 404, "NOT_FOUND");

  await db
    .update(shareAccessRequests)
    .set({ status: ShareAccessRequestStatus.CANCELLED, updatedAt: new Date() })
    .where(
      and(
        eq(shareAccessRequests.shareId, share.id),
        eq(shareAccessRequests.requesterUserId, userId),
        eq(shareAccessRequests.status, ShareAccessRequestStatus.PENDING)
      )
    );
}

async function decideRequest(
  userId: string,
  shareId: string,
  requestId: string,
  approved: boolean
): Promise<void> {
  const [row] = await db
    .select({
      request: shareAccessRequests,
      share: shares,
      requesterEmail: users.email,
    })
    .from(shareAccessRequests)
    .innerJoin(shares, eq(shares.id, shareAccessRequests.shareId))
    .innerJoin(users, eq(users.id, shareAccessRequests.requesterUserId))
    .where(
      and(
        eq(shareAccessRequests.id, requestId),
        eq(shareAccessRequests.shareId, shareId),
        eq(shares.ownerId, userId),
        eq(shareAccessRequests.status, ShareAccessRequestStatus.PENDING)
      )
    )
    .limit(1);

  if (!row) throw new AppError("Request not found", 404, "NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(shareAccessRequests)
      .set({
        status: approved ? ShareAccessRequestStatus.APPROVED : ShareAccessRequestStatus.DENIED,
        decidedAt: new Date(),
        decidedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(shareAccessRequests.id, requestId));

    if (!approved) return;

    await tx
      .insert(shareGrants)
      .values({
        shareId,
        userId: row.request.requesterUserId,
        inviteeEmail: row.requesterEmail.toLowerCase(),
        status: ShareGrantStatus.ACTIVE,
        source: ShareGrantSource.ACCESS_REQUEST,
        invitedBy: userId,
        acceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [shareGrants.shareId, shareGrants.inviteeEmail],
        set: {
          userId: row.request.requesterUserId,
          status: ShareGrantStatus.ACTIVE,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  });

  notifyAccessDecision({
    requesterUserId: row.request.requesterUserId,
    requesterEmail: row.requesterEmail,
    approved,
    share: row.share,
  });
}

export const approveAccessRequest = (userId: string, shareId: string, requestId: string) =>
  decideRequest(userId, shareId, requestId, true);

export const denyAccessRequest = (userId: string, shareId: string, requestId: string) =>
  decideRequest(userId, shareId, requestId, false);

export { generateShareSlug };

/**
 * Only for the unlock endpoint, which by definition runs before the caller
 * has proven anything. Password verification is the gate here, so this must
 * never be used as a general "load a share by slug".
 */
export async function getShareBySlugForUnlock(slug: string): Promise<ShareRow | null> {
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.slug, slug), eq(shares.linkAccess, ShareLinkAccess.PASSWORD)))
    .limit(1);

  return row ?? null;
}
