import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { collections, memories, shareAccessRequests, shareGrants, shares, users } from "../../db/schema";
import { ShareAccessRequestStatus, ShareGrantSource, ShareGrantStatus, ShareLinkAccess } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { notifyAccessDecision, notifyAccessRequested } from "./share.notify";

// A denied request can't be re-opened at once: the partial unique index only stops duplicate *pending* rows.
const DENIED_REQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

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

  // Same 404 as an unknown slug: asking a link not in request mode must not confirm it exists.
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

  // Idempotent: the partial unique index allows one pending row, so a repeat click reports the
  // existing request.
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
