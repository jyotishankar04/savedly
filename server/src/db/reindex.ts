import "dotenv/config";
import { reindexMemories } from "../modules/ai/ingestion/reembed";

// `pnpm db:reindex` — indexes every memory missing embeddings for search by
// meaning (embeddings only; no other AI steps, so no one's allowance is spent).
reindexMemories()
  .then((result) => {
    console.log(`Reindex: ${result.indexed} indexed, ${result.skipped} skipped (no embeddings key), ${result.failed} failed`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Reindex failed:", err);
    process.exit(1);
  });
