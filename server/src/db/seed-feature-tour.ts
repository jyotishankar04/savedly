import { cacheRedis, redis } from "../config/redis";
import { loadFeatureTour } from "../modules/whats-new/whats-new.feature-tour";
import { bumpPublicCache } from "../shared/cache/response-cache";

// Loads the latest release's cards into the landing popup, replacing existing ones. Dev only (pnpm
// db:feature-tour); deployed servers use Admin > What's new.

loadFeatureTour()
  .then(async ({ removed, added }) => {
    // The landing page reads the cards through the shared public cache.
    await bumpPublicCache();
    console.log(`Replaced ${removed} card(s) with the latest release's ${added} cards.`);
  })
  .catch((err) => {
    console.error("Couldn't write the latest release:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    cacheRedis.disconnect();
    redis.disconnect();
    process.exit();
  });
