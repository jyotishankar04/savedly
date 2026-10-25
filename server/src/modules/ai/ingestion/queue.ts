import { Queue, type JobsOptions, type WorkerOptions } from "bullmq";
import { env } from "../../../config/env";
import { redis } from "../../../config/redis";

export interface IngestionJobData {
  memoryId: string;
}

export const INGESTION_QUEUE = "ingestion";

// BullMQ runs the lowest number first and unprioritized jobs before prioritized ones, so a single
// save goes ahead of an import's jobs.
export const BULK_PRIORITY = 10;

// Finished jobs would fill Redis, which is small and refuses writes when full.
export const INGESTION_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: { age: 60 * 60, count: 1000 },
  // Kept longer: a failure is worth being able to look at.
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

/**
 * Items processed at once. Jobs mostly wait, so the ceiling is the provider's rate limit: lower
 * INGESTION_CONCURRENCY if it refuses.
 */
export function ingestionWorkerOptions(): Pick<WorkerOptions, "concurrency"> {
  return { concurrency: env.INGESTION_CONCURRENCY };
}

export const ingestionQueue = new Queue<IngestionJobData>(INGESTION_QUEUE, { connection: redis, defaultJobOptions: INGESTION_JOB_OPTIONS });

/** One save. Fire-and-forget: a queue failure must never fail the create/delete request. */
export async function enqueueIngestion(memoryId: string): Promise<void> {
  await ingestionQueue.add("ingest", { memoryId });
}

// A note gets the AI once; later edits only re-index (chunks and vectors, no AI or allowance; a
// trigger keeps keyword search current). Both wait for writing to stop: each call replaces the
// waiting one (BullMQ debounce), so autosave costs one run.

/** The worker's job name for re-indexing only (reembed.ts), as opposed to "ingest". */
export const REINDEX_JOB = "reindex";

// A note from the full-page editor is processed this long after its writer stops, so the AI reads
// the note, not its first words.
const NOTE_SETTLE_MS = 5 * 60 * 1000;
// Re-indexing is cheap, so search catches up soon after an edit.
const NOTE_REINDEX_MS = 30 * 1000;

/** A note's first processing (the AI), NOTE_SETTLE_MS after the last edit. */
export async function enqueueNoteRefresh(memoryId: string): Promise<void> {
  await ingestionQueue.add(
    "ingest",
    { memoryId },
    { delay: NOTE_SETTLE_MS, deduplication: { id: `note-refresh:${memoryId}`, ttl: NOTE_SETTLE_MS, extend: true, replace: true } },
  );
}

/** An edited note's search index, NOTE_REINDEX_MS after the last edit. */
export async function enqueueNoteReindex(memoryId: string): Promise<void> {
  await ingestionQueue.add(
    REINDEX_JOB,
    { memoryId },
    { delay: NOTE_REINDEX_MS, deduplication: { id: `note-reindex:${memoryId}`, ttl: NOTE_REINDEX_MS, extend: true, replace: true } },
  );
}

/** Many at once (an import, a GitHub stars sync): one round trip to Redis, queued behind single saves. */
export async function enqueueIngestionBulk(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;
  await ingestionQueue.addBulk(memoryIds.map((memoryId) => ({ name: "ingest", data: { memoryId }, opts: { priority: BULK_PRIORITY } })));
}
