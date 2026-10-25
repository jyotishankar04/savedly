import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, memories, refreshTokens, sessions, tags, userPlanAssignments, users } from "../../db/schema";
import { PlanAssignmentStatus, UserStatus } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { getVectorStore } from "../ai/api";
import { deleteMemory, collectMemoryFileKeys, deleteUnusedFiles, ownFileKey } from "../memory/api";

/** How long a soft-deleted account is recoverable; logging back in during it cancels the deletion. */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

/** Bulk and reversible: rides the existing 15-day trash purge. */
export async function trashAllMemories(userId: string): Promise<number> {
  const result = await db
    .update(memories)
    .set({ inTrash: true, trashedAt: new Date() })
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)))
    .returning({ id: memories.id });
  return result.length;
}

/**
 * "Delete permanently": every memory goes through deleteMemory (vectors and files too), then
 * collections and tags. One bad row never aborts the rest.
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
  // Collections and tags go only after all memories, so a failed memory keeps its collection.
  let removedCollections = 0;
  let removedTags = 0;
  if (failed === 0) {
    removedCollections = (await db.delete(collections).where(eq(collections.userId, userId)).returning({ id: collections.id })).length;
    removedTags = (await db.delete(tags).where(eq(tags.userId, userId)).returning({ id: tags.id })).length;
  }
  return { deleted, failed, collections: removedCollections, tags: removedTags };
}

/** Revokes every refresh token and session, so a delete signs the user out everywhere. */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)));
  await db.update(sessions).set({ refreshTokenId: null }).where(eq(sessions.userId, userId));
}

/**
 * Soft delete: status DELETED, deletedAt now, sessions revoked. account-deletion.job.ts wipes later
 * unless the user logs back in.
 */
export async function softDeleteAccount(userId: string): Promise<void> {
  await db.update(users).set({ status: UserStatus.DELETED, deletedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllSessionsForUser(userId);
}

/**
 * Other users.id FKs cascade or set null (audit rows kept), so only sessions and vectors need
 * clearing, vectors before the delete because the cascade removes the memories rows.
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

  // Assignments outlive the user (user_id set null), so end them first or they'd stay "active" and
  // inflate Admin's given-away totals.
  await db
    .update(userPlanAssignments)
    .set({ status: PlanAssignmentStatus.CANCELLED, endsAt: new Date() })
    .where(and(eq(userPlanAssignments.userId, userId), eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE)));

  await db.delete(users).where(eq(users.id, userId));

  await deleteUnusedFiles(avatarKey ? [...fileKeys, avatarKey] : fileKeys, memoryIds);
}
