import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, memories, refreshTokens, sessions, tags, userPlanAssignments, users } from "../../db/schema";
import { PlanAssignmentStatus, UserStatus } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { getVectorStore } from "../ai/api";
import { deleteMemory, collectMemoryFileKeys, deleteUnusedFiles, ownFileKey } from "../memory/api";

/**
 * How long a soft-deleted account is recoverable before the sweep hard-deletes it. Logging back in
 * during this window (auth.service.ts's findOrCreateUser) is the cancellation mechanism — no
 * separate "undo" button needed.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

/**
 * "Move all to trash" — bulk, reversible, rides the existing 15-day trash-purge sweep unchanged. No
 * cascade/vector-store concerns since trashing isn't deleting.
 */
export async function trashAllMemories(userId: string): Promise<number> {
  const result = await db
    .update(memories)
    .set({ inTrash: true, trashedAt: new Date() })
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)))
    .returning({ id: memories.id });
  return result.length;
}

/**
 * "Delete permanently": removes every memory through deleteMemory (so vectors and files go too),
 * then the user's collections and tags. One bad row never aborts the rest.
 */
export async function deleteAllMemoriesNow(userId: string): Promise<{ deleted: number; failed: number; collections: number; tags: number }> {
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
  // Collections and tags only once every memory is gone, so a failed memory
  // (rare) keeps its collection rather than being left uncategorised.
  let removedCollections = 0;
  let removedTags = 0;
  if (failed === 0) {
    removedCollections = (await db.delete(collections).where(eq(collections.userId, userId)).returning({ id: collections.id })).length;
    removedTags = (await db.delete(tags).where(eq(tags.userId, userId)).returning({ id: tags.id })).length;
  }
  return { deleted, failed, collections: removedCollections, tags: removedTags };
}

/**
 * Revokes every refresh token and session for the user, so an account delete signs them out
 * everywhere at once.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)));
  await db.update(sessions).set({ refreshTokenId: null }).where(eq(sessions.userId, userId));
}

/**
 * Soft account delete — status -> DELETED, deletedAt = now, every session revoked immediately. The
 * actual wipe happens later via account-deletion.job.ts's sweep, cancelled if the user logs back in
 * first.
 */
export async function softDeleteAccount(userId: string): Promise<void> {
  await db.update(users).set({ status: UserStatus.DELETED, deletedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllSessionsForUser(userId);
}

/**
 * Hard delete. Other users.id FKs either cascade or set null (audit rows are kept), so only
 * sessions and vectors need clearing first. Vectors go before the delete because the cascade
 * removes the memories rows.
 */
export async function hardDeleteAccount(userId: string): Promise<void> {
  await revokeAllSessionsForUser(userId);

  const userMemories = await db.select({ id: memories.id }).from(memories).where(eq(memories.userId, userId));
  // Their files in storage go too: listed now, deleted once the rows are gone.
  const memoryIds = userMemories.map((m) => m.id);
  const fileKeys = await collectMemoryFileKeys(memoryIds).catch((err) => {
    logger.error({ userId, err }, "[account] couldn't list files before hard delete");
    return [] as string[];
  });
  const [owner] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId));
  const avatarKey = await ownFileKey(owner?.avatarUrl).catch(() => null);
  for (const { id } of userMemories) {
    getVectorStore()
      .then((store) => store.deleteMemoryVectors(id))
      .catch((err) => logger.error({ userId, memoryId: id, err }, "[account] vector cleanup failed during hard delete"));
  }

  // Assignments outlive the user (user_id is set null), so end them first:
  // otherwise a deleted user's grant or subscription would stay "active"
  // with no one on it, and count in Admin -> Overview's given-away totals.
  await db
    .update(userPlanAssignments)
    .set({ status: PlanAssignmentStatus.CANCELLED, endsAt: new Date() })
    .where(and(eq(userPlanAssignments.userId, userId), eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE)));

  await db.delete(users).where(eq(users.id, userId));

  await deleteUnusedFiles(avatarKey ? [...fileKeys, avatarKey] : fileKeys, memoryIds);
}
