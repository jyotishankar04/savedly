import { and, ilike, inArray, notInArray, or } from "drizzle-orm";
import { db } from "../../db";
import { attachments, memories } from "../../db/schema";
import { getStorage, STORAGE_KEY_PATTERN } from "../../platform/storage";
import { logger } from "../../shared/utils/logger";

/**
 * Files in our own storage that memories own (attachments, screenshots, preview image, images in a note), so a permanent delete removes the bytes too; only our own URLs count.
 * Collect keys before deleting rows (collectMemoryFileKeys), delete rows, then deleteUnusedFiles; a key a surviving memory still uses is kept.
 */

const URL_IN_TEXT = /https?:\/\/[^\s"'<>()]+/g;

export async function collectMemoryFileKeys(memoryIds: string[]): Promise<string[]> {
  if (memoryIds.length === 0) return [];
  const storage = await getStorage();

  const [files, rows] = await Promise.all([
    db.select({ url: attachments.fileUrl }).from(attachments).where(inArray(attachments.memoryId, memoryIds)),
    db.select({ preview: memories.previewImageUrl, content: memories.content }).from(memories).where(inArray(memories.id, memoryIds)),
  ]);

  const urls = [
    ...files.map((f) => f.url),
    ...rows.flatMap((r) => [r.preview, ...(r.content?.match(URL_IN_TEXT) ?? [])]),
  ].filter((url): url is string => Boolean(url));

  const keys = new Set<string>();
  for (const url of urls) {
    const key = storage.keyFromUrl(url.replace(/[.,;:!?]+$/, ""));
    // Only keys shaped like our uploads (upload.service.ts), so nothing else in the bucket can be touched.
    if (key && STORAGE_KEY_PATTERN.test(key)) keys.add(key);
  }
  return [...keys];
}

/**
 * Deletes each key's file unless a memory outside `deletedIds` still uses it. Best effort: a
 * failure is logged and never fails the delete.
 */
export async function deleteUnusedFiles(keys: string[], deletedIds: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const storage = await getStorage();
  let removed = 0;

  for (const key of keys) {
    try {
      const pattern = `%${key}%`;
      const others = deletedIds.length > 0 ? notInArray(memories.id, deletedIds) : undefined;
      const [stillUsedByAttachment] = await db
        .select({ id: attachments.id })
        .from(attachments)
        .where(and(ilike(attachments.fileUrl, pattern), deletedIds.length > 0 ? notInArray(attachments.memoryId, deletedIds) : undefined))
        .limit(1);
      const [stillUsedByMemory] = stillUsedByAttachment
        ? [stillUsedByAttachment]
        : await db
            .select({ id: memories.id })
            .from(memories)
            .where(and(or(ilike(memories.previewImageUrl, pattern), ilike(memories.content, pattern)), others))
            .limit(1);
      if (stillUsedByMemory) continue;

      await storage.delete(key);
      removed++;
    } catch (err) {
      logger.error({ key, err }, "[memory-files] couldn't delete a file from storage");
    }
  }
  return removed;
}

/** Collects, then (after `deleteRows` runs) deletes the files of the given memories. */
export async function withFileCleanup<T>(memoryIds: string[], deleteRows: () => Promise<T>): Promise<T> {
  const keys = await collectMemoryFileKeys(memoryIds).catch((err) => {
    logger.error({ err }, "[memory-files] couldn't list files before a delete");
    return [] as string[];
  });
  const result = await deleteRows();
  await deleteUnusedFiles(keys, memoryIds);
  return result;
}

/** The key of one of our own files from its URL, or null. Exported for account cleanup. */
export async function ownFileKey(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const key = (await getStorage()).keyFromUrl(url);
  return key && STORAGE_KEY_PATTERN.test(key) ? key : null;
}

