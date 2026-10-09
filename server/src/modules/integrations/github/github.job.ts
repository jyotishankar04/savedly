import { Queue, Worker } from "bullmq";
import { redis } from "../../../config/redis";
import { logger } from "../../../shared/utils/logger";
import { isGithubStarsEnabled } from "../../feature-flags/feature-flags.service";
import { isGithubStarsConfigured } from "./github-client";
import { syncAllGithubConnections } from "./github.service";

// Picks up newly starred repositories without anyone pressing a button.
// Twice a day: a new star shows up the same day, and each account costs one
// small request to GitHub when nothing changed.

const QUEUE_NAME = "github-stars";
const JOB_NAME = "sync-all";
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

const queue = new Queue(QUEUE_NAME, { connection: redis });

async function run(): Promise<void> {
  if (!(await isGithubStarsEnabled()) || !(await isGithubStarsConfigured())) return;
  const result = await syncAllGithubConnections();
  if (result.accounts > 0) logger.info(result, "[github-stars] scheduled sync finished");
}

/** Mirrors startTrashPurgeWorker's shape: call once from server.ts. Safe to call on every restart. */
export async function startGithubStarsWorker(): Promise<Worker> {
  await queue.upsertJobScheduler(JOB_NAME, { every: SYNC_INTERVAL_MS }, { name: JOB_NAME });
  const worker = new Worker(QUEUE_NAME, () => run(), { connection: redis });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "[github-stars] scheduled sync failed"));
  return worker;
}
