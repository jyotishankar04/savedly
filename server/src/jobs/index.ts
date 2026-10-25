import type { Worker } from "bullmq";
import { startIngestionWorker } from "../modules/ai";
import { startTrashPurgeWorker } from "../modules/memory/trash-purge.job";
import { startReminderWorker } from "../modules/memory/reminder.job";
import { startWeeklyDigestWorker } from "../modules/memory/weekly-digest.job";
import { startEmailWorker } from "../modules/email";
import { startAccountDeletionWorker } from "../modules/account";
import { startGithubStarsWorker } from "../modules/integrations/github/github.job";
import { logger } from "../shared/utils/logger";

/**
 * A BullMQ worker a feature owns. Add one by exporting its start…Worker() and adding a line to
 * BACKGROUND_JOBS; remove it by deleting the line.
 */
interface BackgroundJob {
  /** How the job is named in the log: "<name> started". */
  name: string;
  /** Starts the worker (and, for a scheduled job, registers its schedule). */
  start: () => Worker | Promise<Worker>;
  /** What stops working if it can't start; logged as the error. */
  ifItFails: string;
}

// Same process as the API for now; see the AI ingestion plan for splitting it out.
const BACKGROUND_JOBS: BackgroundJob[] = [
  { name: "Ingestion worker", start: startIngestionWorker, ifItFails: "Failed to start ingestion worker — AI ingestion will not run" },
  { name: "Trash purge worker", start: startTrashPurgeWorker, ifItFails: "Failed to start trash purge worker — trashed memories will not be auto-deleted" },
  { name: "Weekly email worker", start: startWeeklyDigestWorker, ifItFails: "Failed to start the weekly email worker: the Sunday email of things to read won't go out" },
  { name: "Reminder worker", start: startReminderWorker, ifItFails: "Failed to start the reminder worker: reminders set with \"Remind me\" won't arrive" },
  { name: "Email worker", start: startEmailWorker, ifItFails: "Failed to start email worker — outgoing email will not be sent" },
  { name: "Account deletion worker", start: startAccountDeletionWorker, ifItFails: "Failed to start account deletion worker — scheduled account wipes will not run" },
  { name: "GitHub stars worker", start: startGithubStarsWorker, ifItFails: "Failed to start GitHub stars worker — new stars will only sync when someone presses Sync now" },
];

/**
 * Starts every job independently; one failing never stops the rest. The returned list fills as
 * workers come up, so shutdown closes whichever are running.
 */
export function startBackgroundJobs(): Worker[] {
  const workers: Worker[] = [];
  for (const job of BACKGROUND_JOBS) {
    // An async function runs up to its first await at once, so jobs start in order.
    void (async () => {
      try {
        workers.push(await job.start());
        logger.info(`${job.name} started`);
      } catch (err) {
        logger.error({ err }, job.ifItFails);
      }
    })();
  }
  return workers;
}
