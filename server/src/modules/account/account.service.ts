import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { memories, refreshTokens, sessions, users } from "../../db/schema";
import { UserStatus } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { getVectorStore } from "../ai/vector-store";
import { deleteMemory } from "../memory/memory.service";

/** How long a soft-deleted account is recoverable before the sweep hard-deletes it. Logging back in during this window (auth.service.ts's findOrCreateUser) is the cancellation mechanism — no separate "undo" button needed. */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

/** "Move all to trash" — bulk, reversible, rides the existing 15-day trash-purge sweep unchanged. No cascade/vector-store concerns since trashing isn't deleting. */
export async function trashAllMemories(userId: string): Promise<number> {
  const result = await db
    .update(memories)
    .set({ inTrash: true, trashedAt: new Date() })
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)))
    .returning({ id: memories.id });
  return result.length;
}

/**
 * "Delete permanently" now — mirrors sweepExpiredTrash's per-row loop
 * exactly, reusing deleteMemory so the Upstash vector-store cleanup (which
 * only happens inside deleteMemory, never on a bulk DELETE) is never
 * skipped. One bad row never aborts the rest.
 */
export async function deleteAllMemoriesNow(userId: string): Promise<{ deleted: number; failed: number }> {
  const rows = await db.select({ id: memories.id }).from(memories).where(eq(memories.userId, userId));
  let deleted = 0;
  let failed = 0;
  for (const { id } of rows) {
    try {
      await deleteMemory(userId, id);
      deleted++;
    } catch (err) {
      failed++;
      logger.error({ userId, memoryId: id, err }, "[account] failed to delete a memory during clear-all");
    }
  }
  return { deleted, failed };
}

/**
 * New capability — nothing like this exists today. logout()/revokeRefreshToken
 * only ever touch the single token from the request's own cookie. This is
 * the global version: every refresh token revoked, every session detached,
 * so a soft/hard account delete actually signs the user out everywhere
 * immediately rather than just locally.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)));
  await db.update(sessions).set({ refreshTokenId: null }).where(eq(sessions.userId, userId));
}

/** Soft account delete — status -> DELETED, deletedAt = now, every session revoked immediately. The actual wipe happens later via account-deletion.job.ts's sweep, cancelled if the user logs back in first. */
export async function softDeleteAccount(userId: string): Promise<void> {
  await db.update(users).set({ status: UserStatus.DELETED, deletedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllSessionsForUser(userId);
}

/**
 * Hard delete now — no explicit pre-cleanup needed beyond sessions/vectors:
 * every other users.id FK is either cascade (data that belongs to the user)
 * or set null (historical/audit/financial rows, deliberately preserved) —
 * confirmed by a full audit of schema.ts. Vector cleanup must happen BEFORE
 * the delete, unlike deleteMemory's fire-and-forget, since the cascade
 * removes the memories rows the moment the users row goes.
 */
export async function hardDeleteAccount(userId: string): Promise<void> {
  await revokeAllSessionsForUser(userId);

  const userMemories = await db.select({ id: memories.id }).from(memories).where(eq(memories.userId, userId));
  for (const { id } of userMemories) {
    getVectorStore()
      .then((store) => store.deleteMemoryVectors(id))
      .catch((err) => logger.error({ userId, memoryId: id, err }, "[account] vector cleanup failed during hard delete"));
  }

  await db.delete(users).where(eq(users.id, userId));
}
