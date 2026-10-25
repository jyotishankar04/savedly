import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { collections, memories, shareAccessRequests, shareGrants, shares, users } from "../../db/schema";
import { ShareAccessRequestStatus, ShareGrantStatus, ShareLinkAccess, ShareResourceType, PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword as hashSharePassword } from "../../shared/crypto/scrypt-password";
import type { ShareRow } from "./share.access";
import type { CreateShareInput, ListSharesQuery, UpdateShareInput } from "./share.schema";
import { assertFeature, assertWithinLimit } from "../plans/api";

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
 * Confirms the caller owns the resource; scoped by userId in the WHERE, so someone else's looks
 * nonexistent.
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
export async function loadOwnedShare(userId: string, shareId: string, dbClient: DbOrTx = db): Promise<ShareRow> {
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
 * Idempotent: partial unique indexes on (collection_id) / (memory_id) allow one share per resource,
 * so a double-click can't mint two slugs. New shares start DISABLED: creating isn't publishing.
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
    // Bumping passwordUpdatedAt invalidates every issued unlock cookie, including on clear, so
    // removing a password leaves no stale proof valid if one is set again.
    updates.passwordHash = patch.password === null ? null : await hashSharePassword(patch.password);
    updates.passwordUpdatedAt = new Date();
  }

  const willHavePassword =
    patch.password !== undefined ? patch.password !== null : Boolean(existing.passwordHash);

  if (nextAccess === ShareLinkAccess.PASSWORD && !willHavePassword) {
    throw new AppError("Set a password before switching this link to password-protected", 400, "BAD_REQUEST");
  }

  // Switching a link to a plan feature needs the plan; one that already works that way keeps
  // working after a downgrade, and can always be made public (within the allowance) or turned off.
  const addsPassword =
    (nextAccess === ShareLinkAccess.PASSWORD && existing.linkAccess !== ShareLinkAccess.PASSWORD) ||
    (typeof patch.password === "string" && !existing.passwordHash);
  if (addsPassword) await assertFeature(userId, "passwordProtectedShares");
  if (nextAccess === ShareLinkAccess.REQUEST && existing.linkAccess !== ShareLinkAccess.REQUEST) {
    await assertFeature(userId, "privateShareRequests");
  }

  // Only switching *to* public counts against the allowance; an already public link was counted
  // when it went public.
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

/**
 * Only for the unlock endpoint, which runs before the caller proved anything; password verification
 * is the gate, so never use this as a general "load by slug".
 */
export async function getShareBySlugForUnlock(slug: string): Promise<ShareRow | null> {
  const [row] = await db
    .select()
    .from(shares)
    .where(and(eq(shares.slug, slug), eq(shares.linkAccess, ShareLinkAccess.PASSWORD)))
    .limit(1);

  return row ?? null;
}
