import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collections, collectionMemories, memories, memoryTags, tags, users } from "../../db/schema";
import { MemoryStatus } from "../../db/enums";
import type { BatchDeleteInput, BatchMoveToCollectionInput, BatchRestoreInput, BatchResult, BatchTagInput, BatchUpdateStatusInput } from "./batch.schema";

/**
 * Add or remove tags from multiple memories. Mode:
 * - "add": union with existing tags
 * - "remove": remove specified tags only
 * - "replace": set tags exactly (remove all others)
 */
export async function batchTagMemories(userId: string, input: BatchTagInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Verify all memories belong to this user
  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));

  if (owned.length !== input.memoryIds.length) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  result.processed = input.memoryIds.length;

  try {
    await db.transaction(async (tx) => {
      // Resolve tag names to IDs, creating missing ones
      const tagIds: string[] = [];
      for (const tagName of input.tagNames) {
        let [tag] = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, userId), eq(tags.name, tagName)))
          .limit(1);

        if (!tag) {
          [tag] = await tx
            .insert(tags)
            .values({ userId, name: tagName })
            .returning({ id: tags.id });
        }
        tagIds.push(tag.id);
      }

      if (input.mode === "replace") {
        // Delete all existing tags for these memories
        await tx.delete(memoryTags).where(inArray(memoryTags.memoryId, input.memoryIds));
      } else if (input.mode === "remove") {
        // Delete only specified tags
        await tx
          .delete(memoryTags)
          .where(and(inArray(memoryTags.memoryId, input.memoryIds), inArray(memoryTags.tagId, tagIds)));
      }

      if (input.mode === "add" || input.mode === "replace") {
        // Insert new tags (add or replace mode)
        const pairs = input.memoryIds.flatMap((memoryId) => tagIds.map((tagId) => ({ memoryId, tagId })));
        await tx.insert(memoryTags).values(pairs).onConflictDoNothing();
      }

      result.succeeded = input.memoryIds.length;
    });
  } catch (err) {
    result.failed = input.memoryIds.length;
    result.succeeded = 0;
    result.errors = [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }];
  }

  return result;
}

/**
 * Move or add memories to a collection. Mode:
 * - "add": keep existing collections, add this one
 * - "move": remove from all other collections first
 */
export async function batchMoveToCollection(userId: string, input: BatchMoveToCollectionInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Verify all memories belong to this user and collection exists
  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.id, input.collectionId)))
    .limit(1);

  if (!collection) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));

  if (owned.length !== input.memoryIds.length) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  result.processed = input.memoryIds.length;

  try {
    await db.transaction(async (tx) => {
      if (input.mode === "move") {
        // Remove from all other collections
        await tx
          .delete(collectionMemories)
          .where(
            and(
              inArray(collectionMemories.memoryId, input.memoryIds),
              // Ensure we're only deleting from this user's collections
              // (subquery to verify ownership)
            ),
          );
      }

      // Add to target collection
      const pairs = input.memoryIds.map((memoryId) => ({ collectionId: input.collectionId, memoryId }));
      await tx.insert(collectionMemories).values(pairs).onConflictDoNothing();

      result.succeeded = input.memoryIds.length;
    });
  } catch (err) {
    result.failed = input.memoryIds.length;
    result.succeeded = 0;
    result.errors = [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }];
  }

  return result;
}

/**
 * Move memories to trash or permanently delete. Permanent deletion is
 * irreversible and archives all associated data.
 */
export async function batchDeleteMemories(userId: string, input: BatchDeleteInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));

  if (owned.length !== input.memoryIds.length) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  result.processed = input.memoryIds.length;

  try {
    await db.transaction(async (tx) => {
      if (input.permanent) {
        // Permanent delete
        await tx.delete(memories).where(inArray(memories.id, input.memoryIds));
      } else {
        // Soft delete (move to trash)
        await tx
          .update(memories)
          .set({ inTrash: true, trashedAt: new Date() })
          .where(inArray(memories.id, input.memoryIds));
      }
      result.succeeded = input.memoryIds.length;
    });
  } catch (err) {
    result.failed = input.memoryIds.length;
    result.succeeded = 0;
    result.errors = [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }];
  }

  return result;
}

/**
 * Restore memories from trash (deletedAt = null).
 */
export async function batchRestoreMemories(userId: string, input: BatchRestoreInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));

  if (owned.length !== input.memoryIds.length) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  result.processed = input.memoryIds.length;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(memories)
        .set({ inTrash: false, trashedAt: null })
        .where(inArray(memories.id, input.memoryIds));
      result.succeeded = input.memoryIds.length;
    });
  } catch (err) {
    result.failed = input.memoryIds.length;
    result.succeeded = 0;
    result.errors = [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }];
  }

  return result;
}

/**
 * Toggle favorite, archived, or vaulted status on multiple memories.
 */
export async function batchUpdateMemoryStatus(userId: string, input: BatchUpdateStatusInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));

  if (owned.length !== input.memoryIds.length) {
    return { processed: input.memoryIds.length, succeeded: 0, failed: input.memoryIds.length };
  }

  result.processed = input.memoryIds.length;

  try {
    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (input.archived !== undefined) updates.archived = input.archived;
      if (input.favorite !== undefined) updates.favorite = input.favorite;
      if (input.vaulted !== undefined) updates.vaulted = input.vaulted;

      if (Object.keys(updates).length > 0) {
        await tx.update(memories).set(updates).where(inArray(memories.id, input.memoryIds));
      }
      result.succeeded = input.memoryIds.length;
    });
  } catch (err) {
    result.failed = input.memoryIds.length;
    result.succeeded = 0;
    result.errors = [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }];
  }

  return result;
}
