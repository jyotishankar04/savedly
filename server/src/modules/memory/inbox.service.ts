import { and, count, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "../../db";
import { collectionMemories, collections, memories } from "../../db/schema";
import { normalizeUrl } from "./normalize-url";

/** Memories that can be in the Inbox at all: not trashed, archived or in the vault. */
const live = (userId: string) => and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isArchived, false), eq(memories.isVaulted, false));

/** How many are unread in the Inbox, and how many are snoozed until a reminder. */
export async function inboxCounts(userId: string): Promise<{ unread: number; snoozed: number }> {
  const now = new Date();
  const [[unread], [snoozed]] = await Promise.all([
    db
      .select({ value: count() })
      .from(memories)
      .where(and(live(userId), isNull(memories.readAt), or(isNull(memories.remindAt), lte(memories.remindAt, now)))),
    db.select({ value: count() }).from(memories).where(and(live(userId), gt(memories.remindAt, now))),
  ]);
  return { unread: unread?.value ?? 0, snoozed: snoozed?.value ?? 0 };
}

/** "Mark all as read": every unread memory now in the Inbox (snoozed ones stay snoozed). */
export async function markInboxRead(userId: string): Promise<number> {
  const rows = await db
    .update(memories)
    .set({ readAt: new Date() })
    .where(and(live(userId), isNull(memories.readAt), or(isNull(memories.remindAt), lte(memories.remindAt, new Date()))))
    .returning({ id: memories.id });
  return rows.length;
}

export interface SavedPage {
  id: string;
  title: string;
  createdAt: Date;
  readAt: Date | null;
  remindAt: Date | null;
  collections: { id: string; name: string }[];
}

/**
 * Whether a page is already in the library, matched the way duplicates are
 * (normalized URL: no tracking parameters, fragment or trailing slash). For
 * the extension, to show "Saved 3 days ago" instead of saving it twice.
 */
export async function lookupByUrl(userId: string, url: string): Promise<SavedPage | null> {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  const [row] = await db
    .select({ id: memories.id, title: memories.title, createdAt: memories.createdAt, readAt: memories.readAt, remindAt: memories.remindAt })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.normalizedUrl, normalized)))
    .orderBy(memories.createdAt)
    .limit(1);
  if (!row) return null;
  const inCollections = await db
    .select({ id: collections.id, name: collections.name })
    .from(collectionMemories)
    .innerJoin(collections, eq(collections.id, collectionMemories.collectionId))
    .where(and(eq(collectionMemories.memoryId, row.id), eq(collections.isVaulted, false)));
  return { ...row, collections: inCollections };
}
