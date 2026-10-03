import { Redis } from "ioredis";
import { env } from "./env";

// BullMQ requires this exact option — it manages its own retry/blocking
// behavior and errors if the underlying client gives up on its own.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// The response cache's own connection (shared/cache/response-cache.ts). The
// opposite trade-off from the one above: a cache must never make a request
// wait, so commands fail fast instead of queueing while Redis is unreachable.
export const cacheRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  commandTimeout: 250,
});
// Without a listener ioredis logs every reconnect attempt as an unhandled error.
cacheRedis.on("error", () => {});
