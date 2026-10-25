import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { MemoryStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { enqueueIngestion } from "../ai/api";
import type { BrowserCaptureInput } from "./memory.schema";
import type { MemoryDetail } from "./memory.types";
import { assertOwnedMemory } from "./memory.commands";
import { getMemoryById } from "./memory.queries";

// Extension submits whatever the live DOM already gave it (POST
// /:id/browser-capture) — stored as-is, then re-run through ingestion so
// parseWebContent's merge step (buildPreview) can upgrade the preview with
// it, per docs/URL_CAPTURE_AND_PREVIEW.md.
export async function submitBrowserCapture(
  userId: string,
  id: string,
  payload: BrowserCaptureInput,
): Promise<MemoryDetail> {
  await assertOwnedMemory(userId, id);

  await db
    .update(memories)
    .set({ browserCapture: payload, updatedAt: new Date() })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));

  await enqueueIngestion(id).catch((err) => {
    logger.error({ memoryId: id, err }, "Failed to enqueue ingestion job for browser capture");
  });

  return getMemoryById(userId, id);
}

// Re-runs ingestion on demand (e.g. user clicks "retry preview"). A failed
// refresh leaves the prior preview fields untouched — upsertVectors only
// ever writes a field when the corresponding state value is non-null (see
// its `?? undefined` pattern), so nothing gets clobbered by a bad retry.
export async function refreshPreview(userId: string, id: string, options: { retitle?: boolean } = {}): Promise<MemoryDetail> {
  await assertOwnedMemory(userId, id);

  await db
    .update(memories)
    .set({ status: MemoryStatus.PROCESSING, updatedAt: new Date() })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));
  // Asked to read a post that was never read: its title came from nothing (the
  // link alone), so it goes back to the placeholder for the post to name it.
  if (options.retitle) {
    await db
      .update(memories)
      .set({ title: "Untitled" })
      .where(and(eq(memories.id, id), eq(memories.userId, userId), isNull(memories.socialPost)));
  }

  await enqueueIngestion(id).catch((err) => {
    logger.error({ memoryId: id, err }, "Failed to enqueue ingestion job for preview refresh");
  });

  return getMemoryById(userId, id);
}

export interface ProcessingStatus {
  status: string;
  previewStatus: string | null;
  fetchStatus: string | null;
}

export async function getProcessingStatus(userId: string, id: string): Promise<ProcessingStatus> {
  const [row] = await db
    .select({ status: memories.status, previewStatus: memories.previewStatus, fetchStatus: memories.fetchStatus })
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }

  return row;
}
