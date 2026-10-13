import { cacheRedis, redis } from "../config/redis";
import { loadFeatureTour } from "../modules/whats-new/whats-new.feature-tour";
import { bumpPublicCache } from "../shared/cache/response-cache";

// Loads the launch feature tour into the landing page's popup, replacing
// every existing "What's new" card. For a development machine:
//
//   pnpm db:feature-tour
//
// It needs the source tree and tsx, which the production image doesn't
// have. On a deployed server, use the button in Admin > What's new instead;
// it does the same thing.

loadFeatureTour()
  .then(async ({ removed, added }) => {
    // The landing page reads the cards through the shared public cache.
    await bumpPublicCache();
    console.log(`Replaced ${removed} card(s) with the ${added}-card feature tour.`);
  })
  .catch((err) => {
    console.error("Couldn't write the feature tour:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    cacheRedis.disconnect();
    redis.disconnect();
    process.exit();
  });
