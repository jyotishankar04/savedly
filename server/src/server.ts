import "dotenv/config";
import type { Server } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/utils/logger";
import { flushSentry } from "./config/sentry";
import { startBackgroundJobs } from "./jobs";
import { pool } from "./db";
import { cacheRedis, redis } from "./config/redis";
import type { Worker } from "bullmq";

const app = createApp();
const port = env.PORT;

let httpServer: Server | null = null;

httpServer = app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

const workers: Worker[] = startBackgroundJobs();

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
    await pool.end();
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

  await flushSentry();
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

// A rejection nobody handled is a bug: log it (which also reports it) and
// keep serving, as Node would otherwise only print it.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason instanceof Error ? reason : new Error(String(reason)) }, "Unhandled promise rejection");
});
