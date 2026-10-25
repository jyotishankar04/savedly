import { and, eq, inArray } from "drizzle-orm";
import { deleteMemory } from "../memory/api";
import { db } from "../../db";
import { collections, collectionMemories, memories, memoryTags, tags, users } from "../../db/schema";
import { MemoryStatus } from "../../db/enums";
import { assertFeature } from "../plans/api";
import { updateCollection } from "../collection/api";
import type {
  BatchDeleteCollectionsInput,
  BatchDeleteInput,
  BatchMergeCollectionsInput,
  BatchMoveToCollectionInput,
  BatchRestoreInput,
  BatchResult,
  BatchTagInput,
  BatchUncollectInput,
  BatchReadInput,
  BatchRemindInput,
  BatchUpdateStatusInput,
  BatchVaultCollectionsInput,
} from "./batch.schema";

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

  if (input.permanent) {
    // One at a time through deleteMemory, so a bulk permanent delete cleans up
    // exactly what a single one does: files in storage and an external vector
    // store (Upstash, Pinecone) as well as the rows.
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
      // Soft delete (move to trash)
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
      // The columns are isArchived / isFavorite / isVaulted. These used to be
      // written as archived / favorite / vaulted, which Drizzle drops without
      // a word, so bulk favourite, archive and vault never did anything.
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

// --- Collections, and taking memories out of one ------------------------------

/** All-or-nothing ownership, like the memory batches: one stranger's id and nothing happens. */
async function ownsAllCollections(userId: string, ids: string[]): Promise<boolean> {
  const owned = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), inArray(collections.id, ids)));
  return owned.length === new Set(ids).size;
}

const failAll = (count: number, err: unknown): BatchResult => ({
  processed: count,
  succeeded: 0,
  failed: count,
  errors: [{ id: "all", error: err instanceof Error ? err.message : "Unknown error" }],
});

/** Takes memories out of one collection. The memories themselves stay. */
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

/** The Inbox: marks memories read, or unread again. */
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

/** "Remind me" on several at once: each is snoozed until then (or the reminders cancelled). */
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

/**
 * Deletes collections. With memories: "trash" their memories go to Trash
 * first (recoverable for 15 days, like any trashed memory); with "keep" they
 * stay in the library, just no longer in these collections. Share links for
 * the collections go with them (cascade).
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
 * Merges collections into targetId: every memory in the others becomes a
 * member of the target (no duplicates), then the others are deleted, in one
 * transaction. If the target is in the vault, the memories it gains are
 * vaulted too, so the vault rule (a vaulted collection's memories are
 * vaulted) still holds.
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
 * Moves collections into or out of the vault, one at a time through
 * updateCollection, so each one's memories follow it exactly as when it's
 * done by hand. Taking them out needs an unlocked vault (enforced at the
 * route); putting them in needs the vault plan feature.
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
