import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collections, collectionMemories, memories } from "../../db/schema";
import { assertFeature } from "../plans/api";
import { updateCollection } from "../collection/api";
import type { BatchDeleteCollectionsInput, BatchMergeCollectionsInput, BatchResult, BatchVaultCollectionsInput } from "./batch.schema";
import { failAll, ownsAllCollections } from "./batch.memories";

/**
 * Deletes collections. memories "trash" sends their memories to Trash first (recoverable 15 days);
 * "keep" leaves them in the library. Share links go with the collections (cascade).
 */
export async function batchDeleteCollections(userId: string, input: BatchDeleteCollectionsInput): Promise<BatchResult> {
  const count = input.collectionIds.length;
  if (!(await ownsAllCollections(userId, input.collectionIds))) return { processed: count, succeeded: 0, failed: count };
  try {
    await db.transaction(async (tx) => {
      if (input.memories === "trash") {
        const members = await tx
          .select({ id: collectionMemories.memoryId })
          .from(collectionMemories)
          .where(inArray(collectionMemories.collectionId, input.collectionIds));
        const memberIds = [...new Set(members.map((m) => m.id))];
        if (memberIds.length > 0) {
          await tx
            .update(memories)
            .set({ inTrash: true, trashedAt: new Date() })
            .where(and(eq(memories.userId, userId), inArray(memories.id, memberIds), eq(memories.inTrash, false)));
        }
      }
      await tx.delete(collections).where(and(eq(collections.userId, userId), inArray(collections.id, input.collectionIds)));
    });
    return { processed: count, succeeded: count, failed: 0, errors: [] };
  } catch (err) {
    return failAll(count, err);
  }
}

/**
 * Merges collections into targetId: members move over without duplicates, the others are deleted,
 * in one transaction. If the target is vaulted, the memories it gains are vaulted too.
 */
export async function batchMergeCollections(userId: string, input: BatchMergeCollectionsInput): Promise<BatchResult> {
  const ids = [...new Set(input.collectionIds)];
  const count = ids.length;
  if (!(await ownsAllCollections(userId, ids))) return { processed: count, succeeded: 0, failed: count };
  const sources = ids.filter((id) => id !== input.targetId);
  try {
    await db.transaction(async (tx) => {
      const [target] = await tx.select({ isVaulted: collections.isVaulted }).from(collections).where(eq(collections.id, input.targetId));
      const members = await tx
        .select({ id: collectionMemories.memoryId })
        .from(collectionMemories)
        .where(inArray(collectionMemories.collectionId, sources));
      const memberIds = [...new Set(members.map((m) => m.id))];
      if (memberIds.length > 0) {
        await tx
          .insert(collectionMemories)
          .values(memberIds.map((memoryId) => ({ collectionId: input.targetId, memoryId })))
          .onConflictDoNothing();
        if (target?.isVaulted) {
          await tx.update(memories).set({ isVaulted: true }).where(and(eq(memories.userId, userId), inArray(memories.id, memberIds)));
        }
      }
      await tx.delete(collections).where(and(eq(collections.userId, userId), inArray(collections.id, sources)));
    });
    return { processed: count, succeeded: count, failed: 0, errors: [] };
  } catch (err) {
    return failAll(count, err);
  }
}

/**
 * Moves collections into or out of the vault one at a time through updateCollection, so their
 * memories follow. Taking out needs an unlocked vault (route); putting in needs the vault feature.
 */
export async function batchVaultCollections(userId: string, input: BatchVaultCollectionsInput): Promise<BatchResult> {
  const ids = [...new Set(input.collectionIds)];
  if (!(await ownsAllCollections(userId, ids))) return { processed: ids.length, succeeded: 0, failed: ids.length };
  if (input.isVaulted) await assertFeature(userId, "vault");
  const result: BatchResult = { processed: ids.length, succeeded: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      await updateCollection(userId, id, { isVaulted: input.isVaulted });
      result.succeeded++;
    } catch (err) {
      result.failed++;
      result.errors!.push({ id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return result;
}
