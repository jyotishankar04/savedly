import { Queue, Worker } from "bullmq";
import { redis } from "../../../config/redis";
import { logger } from "../../../shared/utils/logger";
import { isRedditSavedEnabled } from "../../feature-flags/api";
import { isRedditConfigured } from "./reddit-client";
import { syncAllRedditConnections } from "./reddit.service";

// Periodically syncs saved posts and comments twice a day.
const QUEUE_NAME = "reddit-saved";
const JOB_NAME = "sync-all";
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

const queue = new Queue(QUEUE_NAME, { connection: redis });

async function run(): Promise<void> {
  if (!(await isRedditSavedEnabled()) || !isRedditConfigured()) return;
  const result = await syncAllRedditConnections();
  if (result.accounts > 0) {
    logger.info(result, "[reddit-saved] scheduled sync finished");
  }
}

export async function startRedditSavedWorker(): Promise<Worker> {
  await queue.upsertJobScheduler(JOB_NAME, { every: SYNC_INTERVAL_MS }, { name: JOB_NAME });
  const worker = new Worker(QUEUE_NAME, () => run(), { connection: redis });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "[reddit-saved] scheduled sync failed"));
  return worker;
}
