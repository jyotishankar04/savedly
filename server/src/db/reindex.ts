import "dotenv/config";
import { reindexMemories } from "../modules/ai/ingestion/reembed";

// `pnpm db:reindex`: embeds every memory missing embeddings (no other AI steps, no allowance spent).
reindexMemories()
  .then((result) => {
    console.log(`Reindex: ${result.indexed} indexed, ${result.skipped} skipped (no embeddings key), ${result.failed} failed`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Reindex failed:", err);
    process.exit(1);
  });
