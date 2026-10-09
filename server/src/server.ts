import "dotenv/config";
import type { Server } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/utils/logger";
import { startIngestionWorker } from "./modules/ai";
import { startTrashPurgeWorker } from "./modules/memory/trash-purge.job";
import { startEmailWorker } from "./modules/email";
import { startAccountDeletionWorker } from "./modules/account";
import { startGithubStarsWorker } from "./modules/integrations/github/github.job";
import { db } from "./db";
import { cacheRedis, redis } from "./config/redis";
import type { Worker } from "bullmq";

const app = createApp();
const port = env.PORT;

let httpServer: Server | null = null;
const workers: Worker[] = [];

httpServer = app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

// Same process as the API for now — fine for dev, see the AI ingestion plan
// for splitting this into its own process/deployment in production.
try {
  const ingestionWorker = startIngestionWorker();
  workers.push(ingestionWorker);
  logger.info("Ingestion worker started");
} catch (err) {
  logger.error({ err }, "Failed to start ingestion worker — AI ingestion will not run");
}

try {
  startTrashPurgeWorker()
    .then((trashWorker) => {
      workers.push(trashWorker);
      logger.info("Trash purge worker started");
    })
    .catch((err) => {
      logger.error({ err }, "Failed to start trash purge worker — trashed memories will not be auto-deleted");
    });
} catch (err) {
  logger.error({ err }, "Failed to start trash purge worker — trashed memories will not be auto-deleted");
}

try {
  const emailWorker = startEmailWorker();
  workers.push(emailWorker);
  logger.info("Email worker started");
} catch (err) {
  logger.error({ err }, "Failed to start email worker — outgoing email will not be sent");
}

try {
  startAccountDeletionWorker()
    .then((accountWorker) => {
      workers.push(accountWorker);
      logger.info("Account deletion worker started");
    })
    .catch((err) => {
      logger.error({ err }, "Failed to start account deletion worker — scheduled account wipes will not run");
    });
} catch (err) {
  logger.error({ err }, "Failed to start account deletion worker — scheduled account wipes will not run");
}

startGithubStarsWorker()
  .then((githubWorker) => {
    workers.push(githubWorker);
    logger.info("GitHub stars worker started");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start GitHub stars worker — new stars will only sync when someone presses Sync now");
  });

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received termination signal, starting graceful shutdown");

  if (httpServer) {
    httpServer.close(() => {
      logger.info("HTTP server closed, no longer accepting new connections");
    });
  }

  logger.info({ count: workers.length }, "Closing BullMQ workers");
  for (const worker of workers) {
    try {
      await worker.close();
      logger.info({ workerName: worker.name }, "Worker closed");
    } catch (err) {
      logger.error({ workerName: worker.name, err }, "Error closing worker");
    }
  }

  try {
    const pgPool = (db as any)._.client;
    await pgPool.end();
    logger.info("Database pool closed");
  } catch (err) {
    logger.error({ err }, "Error closing database pool");
  }

  try {
    await redis.quit();
    cacheRedis.disconnect();
    logger.info("Redis connection closed");
  } catch (err) {
    logger.error({ err }, "Error closing Redis connection");
  }

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

const SHUTDOWN_TIMEOUT_MS = 10000;

process.on("SIGTERM", () => {
  setTimeout(() => {
    logger.error("Graceful shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  gracefulShutdown("SIGTERM").catch((err) => {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  setTimeout(() => {
    logger.error("Graceful shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  gracefulShutdown("SIGINT").catch((err) => {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  });
});
