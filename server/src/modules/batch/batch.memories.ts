import { and, eq, inArray } from "drizzle-orm";
import { deleteMemory } from "../memory/api";
import { db } from "../../db";
import { collections, collectionMemories, memories, memoryTags, tags } from "../../db/schema";
import { assertFeature } from "../plans/api";
import type { BatchDeleteInput, BatchMoveToCollectionInput, BatchRestoreInput, BatchResult, BatchTagInput, BatchUncollectInput, BatchReadInput, BatchRemindInput, BatchUpdateStatusInput } from "./batch.schema";

/** Mode: "add" (union), "remove" (only those), "replace" (set exactly). */
export async function batchTagMemories(userId: string, input: BatchTagInput): Promise<BatchResult> {
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
        await tx.delete(memoryTags).where(inArray(memoryTags.memoryId, input.memoryIds));
      } else if (input.mode === "remove") {
        await tx
          .delete(memoryTags)
          .where(and(inArray(memoryTags.memoryId, input.memoryIds), inArray(memoryTags.tagId, tagIds)));
      }

      if (input.mode === "add" || input.mode === "replace") {
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

/** Mode: "add" keeps existing collections; "move" removes the others first. */
export async function batchMoveToCollection(userId: string, input: BatchMoveToCollectionInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

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
        await tx
          .delete(collectionMemories)
          .where(
            and(
              inArray(collectionMemories.memoryId, input.memoryIds),
            ),
          );
      }

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

/** Moves memories to Trash or deletes them permanently (irreversible, with all associated data). */
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

  if (input.permanent) {
    // One at a time through deleteMemory, so a bulk permanent delete cleans up exactly what a
    // single one does (files, external vectors, rows).
    for (const id of input.memoryIds) {
      try {
        await deleteMemory(userId, id);
        result.succeeded++;
      } catch (err) {
        result.failed++;
        (result.errors ??= []).push({ id, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
    return result;
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(memories)
        .set({ inTrash: true, trashedAt: new Date() })
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

export async function batchUpdateMemoryStatus(userId: string, input: BatchUpdateStatusInput): Promise<BatchResult> {
  const result: BatchResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
  // Same rule as one at a time (memory.service updateMemory): the vault is a plan feature.
  if (input.vaulted === true) await assertFeature(userId, "vault");

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
      // Columns are isArchived / isFavorite / isVaulted: the old names were silently dropped by
      // Drizzle, so bulk favourite, archive and vault did nothing.
      const updates: Partial<typeof memories.$inferInsert> = {};
      if (input.archived !== undefined) updates.isArchived = input.archived;
      if (input.favorite !== undefined) updates.isFavorite = input.favorite;
      if (input.vaulted !== undefined) updates.isVaulted = input.vaulted;

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

/** All-or-nothing ownership, like the memory batches: one stranger's id and nothing happens. */
export async function ownsAllCollections(userId: string, ids: string[]): Promise<boolean> {
  const owned = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), inArray(collections.id, ids)));
  return owned.length === new Set(ids).size;
}

export const failAll = (count: number, err: unknown): BatchResult => ({
  processed: count,
  succeeded: 0,
  failed: count,
  errors: [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }],
});

export async function batchUncollectMemories(userId: string, input: BatchUncollectInput): Promise<BatchResult> {
  const count = input.memoryIds.length;
  const owned = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)));
  if (owned.length !== count || !(await ownsAllCollections(userId, [input.collectionId]))) {
    return { processed: count, succeeded: 0, failed: count };
  }
  try {
    await db
      .delete(collectionMemories)
      .where(and(eq(collectionMemories.collectionId, input.collectionId), inArray(collectionMemories.memoryId, input.memoryIds)));
    return { processed: count, succeeded: count, failed: 0, errors: [] };
  } catch (err) {
    return failAll(count, err);
  }
}

export async function batchSetRead(userId: string, input: BatchReadInput): Promise<BatchResult> {
  const count = input.memoryIds.length;
  try {
    const rows = await db
      .update(memories)
      .set({ readAt: input.read ? new Date() : null })
      .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)))
      .returning({ id: memories.id });
    return rows.length === count ? { processed: count, succeeded: count, failed: 0, errors: [] } : { processed: count, succeeded: rows.length, failed: count - rows.length };
  } catch (err) {
    return failAll(count, err);
  }
}

export async function batchSetReminder(userId: string, input: BatchRemindInput): Promise<BatchResult> {
  const count = input.memoryIds.length;
  try {
    const rows = await db
      .update(memories)
      .set({ remindAt: input.remindAt ? new Date(input.remindAt) : null })
      .where(and(eq(memories.userId, userId), inArray(memories.id, input.memoryIds)))
      .returning({ id: memories.id });
    return rows.length === count ? { processed: count, succeeded: count, failed: 0, errors: [] } : { processed: count, succeeded: rows.length, failed: count - rows.length };
  } catch (err) {
    return failAll(count, err);
  }
}
