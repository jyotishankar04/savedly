import { Queue, Worker } from "bullmq";
import { and, eq, lt } from "drizzle-orm";
import { redis } from "../../config/redis";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { logger } from "../../shared/utils/logger";
import { deleteMemory } from "./memory.commands";

/**
 * How long a trashed memory is safe from permanent deletion; restoring clears trashedAt (in
 * updateMemory).
 */
export const TRASH_RETENTION_DAYS = 15;

const QUEUE_NAME = "trash-purge";
const JOB_NAME = "sweep";

// Frequent enough that "15 days" is a real deadline, without scanning a mostly-empty index every few minutes.
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const purgeQueue = new Queue(QUEUE_NAME, { connection: redis });

/**
 * Hard-deletes trashed memories past retention through `deleteMemory`, the same path as "Delete
 * permanently", so a purge and a manual delete can't diverge.
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
      // One bad row (e.g. a race with a restore) must never stop the sweep; it's retried next run.
      logger.error({ memoryId: id, err }, "[trash-purge] failed to purge a memory");
    }
  }

  return purged;
}

/**
 * Mirrors startIngestionWorker; call once from server.ts. Sweeps immediately, then schedules the
 * repeat idempotently (BullMQ dedupes repeatable jobs), so restarts never stack schedules.
 */
export async function startTrashPurgeWorker(): Promise<Worker> {
  sweepExpiredTrash().catch((err) => logger.error({ err }, "[trash-purge] initial sweep failed"));

  // BullMQ 6's upsertJobScheduler replaced Queue.add's `repeat` option; upsert-by-id, so safe to
  // call on every restart.
  await purgeQueue.upsertJobScheduler(JOB_NAME, { every: SWEEP_INTERVAL_MS }, { name: JOB_NAME });

  const worker = new Worker(QUEUE_NAME, () => sweepExpiredTrash(), { connection: redis });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "[trash-purge] sweep job failed");
  });

  return worker;
}
