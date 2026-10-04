import { Queue, Worker } from "bullmq";
import { and, eq, lt } from "drizzle-orm";
import { redis } from "../../config/redis";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { logger } from "../../shared/utils/logger";
import { deleteMemory } from "./memory.service";

/**
 * How long a trashed memory is safe from permanent deletion. Restoring
 * (inTrash -> false) clears trashedAt in updateMemory, taking it out of
 * this window entirely until it's trashed again.
 */
export const TRASH_RETENTION_DAYS = 15;

const QUEUE_NAME = "trash-purge";
const JOB_NAME = "sweep";

// Frequent enough that "15 days" reads as a real deadline rather than
// "15 days, plus however long until the next run" — without scanning a
// mostly-empty index every few minutes for a result that rarely changes.
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const purgeQueue = new Queue(QUEUE_NAME, { connection: redis });

/**
 * Finds every trashed memory past the retention window and hard-deletes
 * it. Deliberately reuses `deleteMemory` rather than a bespoke bulk query —
 * that's the exact same path "Delete permanently" already takes, so a
 * purge and a manual permanent-delete can never diverge in what they clean
 * up (FK-cascaded attachments/memory_chunks/collection_memories/memory_tags/
 * shares, plus the vector-store cleanup for both pgvector and Upstash).
 */
export async function sweepExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const due = await db
    .select({ id: memories.id, userId: memories.userId })
    .from(memories)
    .where(and(eq(memories.inTrash, true), lt(memories.trashedAt, cutoff)));

  if (due.length === 0) return 0;

  logger.info({ count: due.length }, "[trash-purge] purging expired trashed memories");

  let purged = 0;
  for (const { id, userId } of due) {
    try {
      await deleteMemory(userId, id);
      purged++;
    } catch (err) {
      // One bad row (e.g. a race with a concurrent restore/delete) must
      // never stop the sweep — everything else still gets purged, and this
      // one is re-evaluated on the next run.
      logger.error({ memoryId: id, err }, "[trash-purge] failed to purge a memory");
    }
  }

  return purged;
}

/**
 * Mirrors startIngestionWorker's shape — call once from server.ts.
 *
 * Runs one sweep immediately (so a fresh deploy doesn't wait up to
 * SWEEP_INTERVAL_MS before the first pass) and then schedules the repeat.
 * Scheduling is idempotent: BullMQ dedupes a repeatable job by name + repeat
 * options + jobId, so calling this on every server restart never stacks up
 * duplicate schedules.
 */
export async function startTrashPurgeWorker(): Promise<Worker> {
  sweepExpiredTrash().catch((err) => logger.error({ err }, "[trash-purge] initial sweep failed"));

  // BullMQ 6's repeatable-job API: `Queue.add`'s old `repeat` option was
  // replaced by `upsertJobScheduler`, which is itself upsert-by-id — safe
  // to call on every server restart without stacking up duplicate schedules.
  await purgeQueue.upsertJobScheduler(JOB_NAME, { every: SWEEP_INTERVAL_MS }, { name: JOB_NAME });

  const worker = new Worker(QUEUE_NAME, () => sweepExpiredTrash(), { connection: redis });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "[trash-purge] sweep job failed");
  });

  return worker;
}
