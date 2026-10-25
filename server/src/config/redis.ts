import { Redis } from "ioredis";
import { env } from "./env";

// BullMQ requires this option; it manages its own retries.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// The response cache's own connection: fail fast instead of queueing, so a cache never makes a request wait.
export const cacheRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  commandTimeout: 250,
});
// Without a listener ioredis logs every reconnect attempt as an unhandled error.
cacheRedis.on("error", () => {});
