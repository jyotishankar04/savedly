import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { notifications } from "../../db/schema";
import { NotificationType } from "../../db/enums";
import { bumpUserCache } from "../../shared/cache/response-cache";
import { AppError } from "../../shared/errors/app-error";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Where clicking the notification should take the user. */
  actionUrl?: string | null;
  /** Ids the UI needs to act inline (approve a request, open a share). */
  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

/** The single write path. Everything that notifies a user goes through here. */
export async function createNotification(
  input: CreateNotificationInput,
  dbClient: DbOrTx = db
): Promise<void> {
  await dbClient.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    actionUrl: input.actionUrl ?? null,
    metadata: input.metadata ?? {},
  });
  // Notifications arrive from background work, not from the user's own
  // request, so their cached list and unread count are dropped here.
  await bumpUserCache(input.userId);
}

export async function listNotifications(
  userId: string,
  query: { status?: "unread" | "all"; limit?: number; cursor?: string }
): Promise<{ items: NotificationResponse[]; nextCursor: string | null }> {
  const limit = Math.min(query.limit ?? 30, 100);

  const conditions = [eq(notifications.userId, userId)];
  if (query.status === "unread") conditions.push(isNull(notifications.readAt));
  // Keyset pagination on createdAt — cheaper than OFFSET and stable while
  // new notifications arrive at the top.
  if (query.cursor) conditions.push(lt(notifications.createdAt, new Date(query.cursor)));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(toResponse);

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
  };
}

function toResponse(row: typeof notifications.$inferSelect): NotificationResponse {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    actionUrl: row.actionUrl,
    metadata: row.metadata ?? {},
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return row?.value ?? 0;
}

export async function markRead(userId: string, id: string): Promise<void> {
  // Ownership in the WHERE, like everywhere else — someone else's
  // notification id is indistinguishable from one that doesn't exist.
  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });

  if (!row) throw new AppError("Notification not found", 404, "NOT_FOUND");
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  const [row] = await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });

  if (!row) throw new AppError("Notification not found", 404, "NOT_FOUND");
}
