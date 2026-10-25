import { Queue, Worker } from "bullmq";
import { and, eq, lt } from "drizzle-orm";
import { redis } from "../../config/redis";
import { db } from "../../db";
import { users } from "../../db/schema";
import { UserStatus } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { ACCOUNT_DELETION_GRACE_DAYS, hardDeleteAccount } from "./account.service";

const QUEUE_NAME = "account-deletion";
const JOB_NAME = "sweep";

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const deletionQueue = new Queue(QUEUE_NAME, { connection: redis });

/** Hard-deletes every soft-deleted account past its grace period. One bad row never aborts the sweep. */
export async function sweepExpiredDeletions(): Promise<number> {
  const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const due = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.status, UserStatus.DELETED), lt(users.deletedAt, cutoff)));

  if (due.length === 0) return 0;

  logger.info({ count: due.length }, "[account-deletion] purging expired soft-deleted accounts");

  let purged = 0;
  for (const { id } of due) {
    try {
      await hardDeleteAccount(id);
      purged++;
    } catch (err) {
      logger.error({ userId: id, err }, "[account-deletion] failed to purge a user");
    }
  }

  return purged;
}

export async function startAccountDeletionWorker(): Promise<Worker> {
  sweepExpiredDeletions().catch((err) => logger.error({ err }, "[account-deletion] initial sweep failed"));

  await deletionQueue.upsertJobScheduler(JOB_NAME, { every: SWEEP_INTERVAL_MS }, { name: JOB_NAME });

  const worker = new Worker(QUEUE_NAME, () => sweepExpiredDeletions(), { connection: redis });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "[account-deletion] sweep job failed");
  });

  return worker;
}
