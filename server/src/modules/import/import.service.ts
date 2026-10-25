import { and, count, eq } from "drizzle-orm";
import { db } from "../../db";
import { importBatches, importItems, memories } from "../../db/schema";
import { ImportItemStatus, ImportSourceType, MemoryStatus, MemoryType, PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { enqueueIngestionBulk } from "../ai/api";
import { normalizeUrl } from "../memory/api";
import { parseBookmarksHtml } from "./bookmark-parser";
import { parseUrlList } from "./url-list-parser";
import { IMPORT_MAX_URLS, type ImportInput, type ListImportItemsQuery } from "./import.schema";
import { assertWithinLimit } from "../plans/api";

interface ParsedItem {
  url: string;
  title: string | null;
}

export async function runImport(userId: string, input: ImportInput) {
  const parsed: ParsedItem[] = input.sourceType === ImportSourceType.BOOKMARKS_HTML ? parseBookmarksHtml(input.content) : parseUrlList(input.content);

  if (parsed.length === 0) {
    throw new AppError("No URLs found in the file", 422, "IMPORT_EMPTY");
  }
  await assertWithinLimit(userId, PlanLimitType.IMPORT_MONTHLY_COUNT, 1);

  // Dedupe within the batch: two identical lines in one paste mustn't make two memories.
  const seen = new Set<string>();
  const inBatchUnique: ParsedItem[] = [];
  for (const item of parsed) {
    const key = normalizeUrl(item.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    inBatchUnique.push(item);
  }

  if (inBatchUnique.length > IMPORT_MAX_URLS) {
    throw new AppError(
      `This file has ${inBatchUnique.length} URLs — the limit per import is ${IMPORT_MAX_URLS}. Split it into smaller files.`,
      422,
      "IMPORT_TOO_LARGE",
    );
  }

  // One upfront query for all the user's normalizedUrls, not a lookup per row.
  const existingRows = await db
    .select({ normalizedUrl: memories.normalizedUrl })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)));
  const existingSet = new Set(existingRows.map((r) => r.normalizedUrl).filter((v): v is string => Boolean(v)));

  const toCreate = inBatchUnique.filter((item) => !existingSet.has(normalizeUrl(item.url) ?? ""));
  const duplicates = inBatchUnique.filter((item) => existingSet.has(normalizeUrl(item.url) ?? ""));

  await assertWithinLimit(userId, PlanLimitType.MEMORY_COUNT, toCreate.length);

  const { batchId, created } = await db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(importBatches)
      .values({ userId, sourceType: input.sourceType, totalCount: inBatchUnique.length })
      .returning();

    const memoryRows = toCreate.length
      ? await tx
          .insert(memories)
          .values(
            toCreate.map((item) => ({
              userId,
              type: MemoryType.WEB,
              title: item.title ?? "Untitled",
              url: item.url,
              normalizedUrl: normalizeUrl(item.url),
              captureMethod: "import",
            })),
          )
          .returning({ id: memories.id, url: memories.url })
      : [];

    if (memoryRows.length > 0) {
      await tx.insert(importItems).values(
        memoryRows.map((m) => ({ batchId: batch.id, url: m.url ?? "", status: ImportItemStatus.CREATED, memoryId: m.id })),
      );
    }
    if (duplicates.length > 0) {
      await tx.insert(importItems).values(
        duplicates.map((item) => ({ batchId: batch.id, url: item.url, status: ImportItemStatus.SKIPPED_DUPLICATE })),
      );
    }

    await tx
      .update(importBatches)
      .set({ createdCount: memoryRows.length, skippedCount: duplicates.length })
      .where(eq(importBatches.id, batch.id));

    return { batchId: batch.id, created: memoryRows };
  });

  // After commit, batched straight to the queue (like sendBulkEmail).
  await enqueueIngestionBulk(created.map((m) => m.id));

  return { batchId, totalCount: inBatchUnique.length, createdCount: created.length, skippedCount: duplicates.length };
}

export async function getImportBatch(userId: string, batchId: string) {
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)))
    .limit(1);
  if (!batch) throw new AppError("Import batch not found", 404, "NOT_FOUND");

  // "Still processing" is the created memories' ingestion status; runImport is synchronous, so the
  // batch row is already final.
  const [{ value: stillProcessing }] = await db
    .select({ value: count() })
    .from(memories)
    .innerJoin(importItems, eq(importItems.memoryId, memories.id))
    .where(and(eq(importItems.batchId, batchId), eq(memories.status, MemoryStatus.PROCESSING)));

  return { ...batch, stillProcessing: stillProcessing > 0 };
}

export async function listImportItems(userId: string, batchId: string, query: ListImportItemsQuery) {
  const [batch] = await db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)))
    .limit(1);
  if (!batch) throw new AppError("Import batch not found", 404, "NOT_FOUND");

  const [{ value: total }] = await db.select({ value: count() }).from(importItems).where(eq(importItems.batchId, batchId));

  const items = await db
    .select()
    .from(importItems)
    .where(eq(importItems.batchId, batchId))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return { items, page: query.page, limit: query.limit, total };
}
