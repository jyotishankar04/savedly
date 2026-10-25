import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { attachments, collectionMemories, collections, memories, memoryTags } from "../../db/schema";
import { MemoryStatus, MemoryType, PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { withFileCleanup } from "./memory-files";
import { enqueueIngestion, enqueueNoteRefresh, enqueueNoteReindex, getVectorStore } from "../ai/api";
import { normalizeUrl } from "./normalize-url";
import type { AttachmentInput, CreateMemoryInput, UpdateMemoryInput } from "./memory.schema";
import { assertFeature, assertWithinLimit } from "../plans/api";
import { DuplicateStatus, findDuplicate } from "./duplicates";
import type { MemoryDetail, Tx } from "./memory.types";
import { getMemoryById } from "./memory.queries";
import { resolveTagIds } from "./memory.tags";

/**
 * Saves meant to be read or watched later: they start unread, in the Inbox. Notes and voice memos
 * are the user's own words.
 */
export const READ_LATER_TYPES = new Set<string>(["web", "video", "document", "image"]);

async function insertAttachments(tx: Tx, memoryId: string, input: AttachmentInput[]): Promise<void> {
  if (input.length === 0) return;
  await tx.insert(attachments).values(
    input.map((attachment) => ({
      memoryId,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    })),
  );
}

export async function createMemory(
  userId: string,
  input: CreateMemoryInput,
): Promise<MemoryDetail & { duplicateOf: { id: string; title: string } | null }> {
  await assertWithinLimit(userId, PlanLimitType.MEMORY_COUNT, 1);

  const normalizedUrl = normalizeUrl(input.url);
  const existing = await findDuplicate(userId, { type: input.type, normalizedUrl, content: input.content });
  // Saved from the app: ask before saving a second copy.
  if (existing && input.onDuplicate === "ask") {
    throw new AppError("This is already in your library.", 409, "DUPLICATE_MEMORY", { existing });
  }
  // What the pipeline's duplicate check should make of this memory. Decided
  // here whenever the answer is already known, so it never asks twice.
  const duplicateStatus = input.onDuplicate ? (existing ? DuplicateStatus.KEPT : DuplicateStatus.NONE) : null;
  const duplicateOf = existing ? { id: existing.id, title: existing.title } : null;

  const memoryId = await db.transaction(async (tx) => {
    // An image memory with an uploaded attachment but no explicit preview gets
    // one for free — this is what makes the list-view thumbnail show the real
    // uploaded image without any client-side change.
    const previewImageUrl =
      input.previewImageUrl ??
      (input.type === "image" ? input.attachments?.[0]?.fileUrl : undefined);

    const values: typeof memories.$inferInsert = {
      userId,
      type: input.type as MemoryType,
      title: input.title ?? "Untitled",
      url: input.url,
      normalizedUrl,
      content: input.content,
      description: input.description,
      faviconUrl: input.faviconUrl,
      previewImageUrl,
      keywords: input.keywords,
      captureMethod: input.captureMethod ?? "manual",
      // Things to read or watch go to the Inbox unread; what the user wrote themselves doesn't.
      readAt: READ_LATER_TYPES.has(input.type) ? null : new Date(),
      duplicateStatus,
      duplicateOfId: input.onDuplicate && existing ? existing.id : null,
    };
    const [row] = await tx.insert(memories).values(values).returning({ id: memories.id });

    if (input.attachments?.length) {
      await insertAttachments(tx, row.id, input.attachments);
    }

    if (input.collectionIds?.length) {
      const owned = await tx
        .select({ id: collections.id, isVaulted: collections.isVaulted })
        .from(collections)
        .where(and(eq(collections.userId, userId), inArray(collections.id, input.collectionIds)));
      if (owned.length > 0) {
        await tx
          .insert(collectionMemories)
          .values(owned.map((collection) => ({ collectionId: collection.id, memoryId: row.id })));

        // Filing straight into a vaulted collection hides the memory too —
        // otherwise "vault this collection" wouldn't actually hide anything
        // saved into it afterward.
        if (owned.some((collection) => collection.isVaulted)) {
          await tx.update(memories).set({ isVaulted: true }).where(eq(memories.id, row.id));
        }
      }
    }

    if (input.tags?.length) {
      const tagIds = await resolveTagIds(tx, userId, input.tags);
      if (tagIds.length > 0) {
        await tx.insert(memoryTags).values(tagIds.map((tagId) => ({ memoryId: row.id, tagId })));
      }
    }

    return row.id;
  });

  // Fire-and-forget: AI ingestion runs async in the background — a queue
  // failure must never fail the create request itself. A note still being
  // written waits until its writer stops.
  (input.editing && input.type === "note" ? enqueueNoteRefresh(memoryId) : enqueueIngestion(memoryId)).catch((err) => {
    logger.error({ memoryId, err }, "Failed to enqueue ingestion job");
  });

  const detail = await getMemoryById(userId, memoryId);
  return { ...detail, duplicateOf };
}

/** The columns an update changes: only the fields the request carried. */
function columnsFromInput(input: UpdateMemoryInput): Record<string, unknown> {
  const columns: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) columns.title = input.title;
  if (input.content !== undefined) columns.content = input.content;
  if (input.description !== undefined) columns.description = input.description;
  if (input.isFavorite !== undefined) columns.isFavorite = input.isFavorite;
  if (input.isArchived !== undefined) columns.isArchived = input.isArchived;
  if (input.inTrash !== undefined) {
    columns.inTrash = input.inTrash;
    // Starts or clears the 15-day purge clock (trash-purge.job.ts). Restoring clears it so a later
    // trash starts a fresh window.
    columns.trashedAt = input.inTrash ? new Date() : null;
  }
  // Un-vaulting needs an unlocked vault (requireUnlockToUnvault at the route); vaulting needs no check.
  if (input.isVaulted !== undefined) columns.isVaulted = input.isVaulted;
  if (input.eventAt !== undefined) columns.eventAt = input.eventAt ? new Date(input.eventAt) : null;
  if (input.isRead !== undefined) columns.readAt = input.isRead ? new Date() : null;
  // A new reminder snoozes it until then; null cancels one.
  if (input.remindAt !== undefined) columns.remindAt = input.remindAt ? new Date(input.remindAt) : null;
  return columns;
}

async function replaceCollections(tx: Tx, userId: string, id: string, collectionIds: string[]): Promise<void> {
  await tx.delete(collectionMemories).where(eq(collectionMemories.memoryId, id));
  if (collectionIds.length === 0) return;
  const owned = await tx
    .select({ id: collections.id, isVaulted: collections.isVaulted })
    .from(collections)
    .where(and(eq(collections.userId, userId), inArray(collections.id, collectionIds)));
  if (owned.length === 0) return;
  await tx
    .insert(collectionMemories)
    .values(owned.map((collection) => ({ collectionId: collection.id, memoryId: id })));

  // Same inherit-on-file-in rule as createMemory.
  if (owned.some((collection) => collection.isVaulted)) {
    await tx.update(memories).set({ isVaulted: true }).where(eq(memories.id, id));
  }
}

async function replaceTags(tx: Tx, userId: string, id: string, tags: string[]): Promise<void> {
  await tx.delete(memoryTags).where(eq(memoryTags.memoryId, id));
  if (tags.length === 0) return;
  const tagIds = await resolveTagIds(tx, userId, tags);
  if (tagIds.length > 0) {
    await tx.insert(memoryTags).values(tagIds.map((tagId) => ({ memoryId: id, tagId })));
  }
}

/**
 * A note's text changed: re-index it for search once editing stops, without re-running the AI. A
 * note not yet processed (written in the full-page editor) has its first processing pushed back.
 */
function requeueEditedNote(id: string, type: string, status: string, input: UpdateMemoryInput): void {
  if (type !== MemoryType.NOTE || (input.content === undefined && input.title === undefined)) return;
  const queued = [enqueueNoteReindex(id), ...(status === MemoryStatus.PROCESSING ? [enqueueNoteRefresh(id)] : [])];
  Promise.all(queued).catch((err) => {
    logger.error({ memoryId: id, err }, "Failed to queue the edited note's re-index");
  });
}

export async function updateMemory(
  userId: string,
  id: string,
  input: UpdateMemoryInput,
): Promise<MemoryDetail> {
  // Moving into the vault needs the plan; taking something out never does.
  if (input.isVaulted === true) await assertFeature(userId, "vault");
  const { type, status } = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(memories)
      .set(columnsFromInput(input))
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning({ id: memories.id, type: memories.type, status: memories.status });

    if (!updated) {
      throw new AppError("Memory not found", 404, "NOT_FOUND");
    }

    if (input.collectionIds !== undefined) await replaceCollections(tx, userId, id, input.collectionIds);
    if (input.tags !== undefined) await replaceTags(tx, userId, id, input.tags);
    if (input.attachments !== undefined) {
      await tx.delete(attachments).where(eq(attachments.memoryId, id));
      await insertAttachments(tx, id, input.attachments);
    }
    return updated;
  });

  requeueEditedNote(id, type, status, input);

  return getMemoryById(userId, id);
}

export async function deleteMemory(userId: string, id: string): Promise<void> {
  await assertOwnedMemory(userId, id);
  // The memory's files go from storage too (memory-files.ts), not just the
  // rows pointing at them: a permanent delete leaves nothing behind.
  const [deleted] = await withFileCleanup([id], () =>
    db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning({ id: memories.id }),
  );

  if (!deleted) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }

  // Only meaningful when VECTOR_STORE_PROVIDER=upstash — pgvector cleans up
  // via cascade automatically. Best-effort: an orphaned vector costs a
  // little storage, but must never block the delete response.
  getVectorStore()
    .then((store) => store.deleteMemoryVectors(id))
    .catch((err) => {
      logger.error({ memoryId: id, err }, "Failed to delete memory vectors");
    });
}

export async function assertOwnedMemory(userId: string, id: string): Promise<void> {
  const [row] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);
  if (!row) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }
}
