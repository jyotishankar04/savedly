import type { Memory } from "@/types/memory";

/** True while a memory is still mid-ingestion (memories.status, set server-side — see docs/URL_CAPTURE_AND_PREVIEW.md). */
export function isMemoryProcessing(item: Pick<Memory, "status">): boolean {
  return item.status === "processing";
}

/** How long after saving a memory can still be waiting for the AI to file it. */
const AWAITING_AI_FOR_MS = 10 * 60 * 1000;

/**
 * True while it's worth asking the server about this memory again: it's still
 * being processed, or it was saved in the last few minutes and the AI hasn't
 * filed it yet (resourceCategory). An older one without a category has
 * finished without it (AI off, or it failed) and won't get one by waiting.
 */
export function isMemoryStillUpdating(item: Pick<Memory, "status" | "resourceCategory" | "createdAt">): boolean {
  if (isMemoryProcessing(item)) return true;
  return item.resourceCategory === null && Date.now() - new Date(item.createdAt).getTime() < AWAITING_AI_FOR_MS;
}
