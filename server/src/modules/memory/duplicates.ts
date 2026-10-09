import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { memories, notifications } from "../../db/schema";
import { MemoryType, NotificationType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { bumpUserCache } from "../../shared/cache/response-cache";

// Duplicate detection: is this thing already in the library?
//
// Two things count, and both are exact, so a "duplicate" is never a guess:
//   - a link with the same address (after normalizing tracking parameters,
//     trailing slashes and so on: see normalize-url.ts)
//   - a note with the same text, ignoring case and surrounding spaces
//
// Used in two places. When someone saves from the app, the check runs before
// the save, so they can be asked first. For everything saved without a
// person watching (the extension's shortcut, a share from a phone), the
// ingestion pipeline's detectDuplicate step runs it afterwards and leaves a
// notification.

/** A note this short ("todo", "call mum") repeats by accident; it isn't a duplicate worth asking about. */
const MIN_NOTE_LENGTH = 20;

export const DuplicateStatus = {
  /** Checked: nothing like it in the library. */
  NONE: "none",
  /** A duplicate was found and the user hasn't said what to do. */
  PENDING: "pending",
  /** The user chose to have both. */
  KEPT: "kept",
} as const;
export type DuplicateStatusValue = (typeof DuplicateStatus)[keyof typeof DuplicateStatus];

export interface ExistingMemory {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

const noteKey = (text: string) => text.trim().toLowerCase();

/** The memory this would duplicate, or null. `excludeId` is the memory being checked, when it already exists. */
export async function findDuplicate(
  userId: string,
  candidate: { type: string; normalizedUrl: string | null; content: string | null | undefined },
  excludeId?: string,
): Promise<ExistingMemory | null> {
  const isNote = candidate.type === MemoryType.NOTE && !candidate.normalizedUrl;
  const text = isNote && candidate.content ? noteKey(candidate.content) : "";

  const match = candidate.normalizedUrl
    ? eq(memories.normalizedUrl, candidate.normalizedUrl)
    : text.length >= MIN_NOTE_LENGTH
      ? and(eq(memories.type, MemoryType.NOTE), isNull(memories.normalizedUrl), sql`lower(btrim(${memories.content})) = ${text}`)
      : null;
  if (!match) return null;

  const [row] = await db
    .select({ id: memories.id, title: memories.title, type: memories.type, createdAt: memories.createdAt })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), match, excludeId ? ne(memories.id, excludeId) : undefined))
    // The original: the oldest copy is the one the others duplicate.
    .orderBy(memories.createdAt)
    .limit(1);
  return row ? { id: row.id, title: row.title, type: row.type, createdAt: row.createdAt.toISOString() } : null;
}

/** Marks the "duplicate detected" notifications about this memory as read: the question has been answered. */
async function settleNotifications(userId: string, memoryId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, NotificationType.DUPLICATE_DETECTED),
        isNull(notifications.readAt),
        sql`${notifications.metadata}->>'memoryId' = ${memoryId}`,
      ),
    );
}

/**
 * Records that the user has answered the "this is a duplicate" question for a
 * memory, so it is never asked again, and clears the notification that asked.
 * Removing the new copy, when that was the answer, is the caller's job: it
 * goes through the normal move-to-Trash path.
 */
export async function settleDuplicate(userId: string, memoryId: string): Promise<void> {
  const settled = await db
    .update(memories)
    .set({ duplicateStatus: DuplicateStatus.KEPT })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .returning({ id: memories.id });
  if (settled.length === 0) throw new AppError("Memory not found", 404, "NOT_FOUND");
  await settleNotifications(userId, memoryId);
  await bumpUserCache(userId);
}
