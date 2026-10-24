import { Queue, type JobsOptions, type WorkerOptions } from "bullmq";
import { env } from "../../../config/env";
import { redis } from "../../../config/redis";

export interface IngestionJobData {
  memoryId: string;
}

export const INGESTION_QUEUE = "ingestion";

// BullMQ takes the lowest number first, and a job with no priority before
// any that has one. So a single save (no priority) is always picked up ahead
// of an import's jobs: someone saving one link in the middle of a 500-item
// import waits for a free slot, not for the import.
export const BULK_PRIORITY = 10;

// Finished jobs are only useful for a while. Left in place they would fill
// Redis, which is small and refuses writes when full.
export const INGESTION_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: { age: 60 * 60, count: 1000 },
  // Kept longer: a failure is worth being able to look at.
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

/**
 * How many saved items are processed at the same time. A job is almost all
 * waiting (a page fetch, then model calls), so the real ceiling is the AI
 * provider's rate limit, not this server: lower INGESTION_CONCURRENCY if the
 * provider starts refusing requests.
 */
export function ingestionWorkerOptions(): Pick<WorkerOptions, "concurrency"> {
  return { concurrency: env.INGESTION_CONCURRENCY };
}

export const ingestionQueue = new Queue<IngestionJobData>(INGESTION_QUEUE, { connection: redis, defaultJobOptions: INGESTION_JOB_OPTIONS });

/** One save. Fire-and-forget from memory.service.ts — never let a queue failure fail the create/delete request. */
export async function enqueueIngestion(memoryId: string): Promise<void> {
  await ingestionQueue.add("ingest", { memoryId });
}

// A note gets the AI once: its summary, tags, collection and dates come from
// its first processing. After that an edit only re-indexes it for search by
// meaning (chunks and vectors, no AI and no allowance; keyword search is kept
// current by a database trigger). Both wait for the writing to stop: every
// call while one is waiting replaces it and starts the wait again (BullMQ's
// debounce), so autosaving every few seconds costs one run.

/** The worker's job name for re-indexing only (reembed.ts), as opposed to "ingest". */
export const REINDEX_JOB = "reindex";

// A note started in the full-page editor is processed this long after its
// writer stops, so the AI reads the note, not its first few words.
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
