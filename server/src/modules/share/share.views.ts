import crypto from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db";
import { shares, shareViews, users } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";

/**
 * A request is not a view: reloads, network retries and React StrictMode's double effect each cause
 * extra hits. Anything from the same viewer within this window collapses into the recorded view;
 * only the first inserts a row and bumps the counter. 30 minutes is the usual analytics session
 * boundary.
 */
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;

/**
 * Salted per share, so a viewer can't be correlated across shares, and the raw IP is never stored.
 * For de-duplicating anonymous visits, not identifying people.
 */
function hashViewerIp(ip: string, shareId: string): string {
  return crypto.createHash("sha256").update(`${ip}:${shareId}`).digest("hex");
}

/**
 * Fire-and-forget: recording a view must never slow or fail a page load. Dedupes by signed-in
 * identity, else by hashed IP.
 */
export function recordShareView(shareId: string, viewerUserId: string | null, ip: string): void {
  void (async () => {
    const ipHash = viewerUserId ? null : hashViewerIp(ip, shareId);
    const dedupeMatch = viewerUserId
      ? eq(shareViews.viewerUserId, viewerUserId)
      : eq(shareViews.viewerIpHash, ipHash!);

    const [recent] = await db
      .select({ id: shareViews.id })
      .from(shareViews)
      .where(
        and(
          eq(shareViews.shareId, shareId),
          dedupeMatch,
          gt(shareViews.createdAt, new Date(Date.now() - VIEW_DEDUP_WINDOW_MS))
        )
      )
      .limit(1);

    if (recent) return;

    await db.insert(shareViews).values({ shareId, viewerUserId, viewerIpHash: ipHash });
    await db
      .update(shares)
      .set({ viewCount: sql`${shares.viewCount} + 1`, lastViewedAt: new Date() })
      .where(eq(shares.id, shareId));
  })().catch((err) => logger.warn({ shareId, err }, "Failed to record share view"));
}

export interface ShareViewSummary {
  totalViews: number;
  uniqueSignedInViewers: number;
  uniqueAnonymousViewers: number;
  lastViewedAt: Date | null;
}

async function assertOwnsShare(userId: string, shareId: string): Promise<void> {
  const [row] = await db
    .select({ id: shares.id })
    .from(shares)
    .where(and(eq(shares.id, shareId), eq(shares.ownerId, userId)))
    .limit(1);
  if (!row) throw new AppError("Share not found", 404, "NOT_FOUND");
}

export async function getShareViewSummary(userId: string, shareId: string): Promise<ShareViewSummary> {
  await assertOwnsShare(userId, shareId);

  const [row] = await db
    .select({
      totalViews: sql<number>`count(*)::int`,
      uniqueSignedInViewers: sql<number>`count(distinct ${shareViews.viewerUserId})::int`,
      uniqueAnonymousViewers: sql<number>`count(distinct ${shareViews.viewerIpHash})::int`,
      lastViewedAt: sql<Date | null>`max(${shareViews.createdAt})`,
    })
    .from(shareViews)
    .where(eq(shareViews.shareId, shareId));

  return {
    totalViews: row?.totalViews ?? 0,
    uniqueSignedInViewers: row?.uniqueSignedInViewers ?? 0,
    uniqueAnonymousViewers: row?.uniqueAnonymousViewers ?? 0,
    lastViewedAt: row?.lastViewedAt ?? null,
  };
}

const VIEW_HISTORY_DAYS = 30;

export interface DateCount {
  date: string;
  count: number;
}

/** Sparse: only days with a view (as insights' getActivity does); the client fills the gaps. */
export async function getShareViewsDaily(userId: string, shareId: string): Promise<DateCount[]> {
  await assertOwnsShare(userId, shareId);

  const day = sql<string>`date(${shareViews.createdAt})`;
  const since = new Date(Date.now() - VIEW_HISTORY_DAYS * 24 * 60 * 60 * 1000);

  return db
    .select({ date: day, count: sql<number>`count(*)::int` })
    .from(shareViews)
    .where(and(eq(shareViews.shareId, shareId), gt(shareViews.createdAt, since)))
    .groupBy(day)
    .orderBy(day);
}

export interface ShareViewerEntry {
  id: string;
  viewerName: string | null;
  viewerEmail: string | null;
  isAnonymous: boolean;
  viewedAt: Date;
}

/**
 * The owner-only "who viewed this" list, most recent first. Signed-in viewers carry their identity;
 * anonymous rows carry neither name nor email (shown as "Anonymous visitor"), and the hashed IP
 * isn't enough to track anyone, by design.
 */
export async function listShareViewers(
  userId: string,
  shareId: string,
  limit = 50
): Promise<ShareViewerEntry[]> {
  await assertOwnsShare(userId, shareId);

  const rows = await db
    .select({
      id: shareViews.id,
      viewerName: users.name,
      viewerEmail: users.email,
      viewedAt: shareViews.createdAt,
      viewerUserId: shareViews.viewerUserId,
    })
    .from(shareViews)
    .leftJoin(users, eq(users.id, shareViews.viewerUserId))
    .where(eq(shareViews.shareId, shareId))
    .orderBy(desc(shareViews.createdAt))
    .limit(Math.min(limit, 100));

  return rows.map((row) => ({
    id: row.id,
    viewerName: row.viewerName,
    viewerEmail: row.viewerEmail,
    isAnonymous: row.viewerUserId === null,
    viewedAt: row.viewedAt,
  }));
}
