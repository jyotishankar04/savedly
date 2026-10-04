import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

// The guides in content/docs, grouped by folder (one per help category).
// Served under /help/docs, so a page at content/docs/ai/ask.mdx is /help/docs/ai/ask.
const docs = defineDocs({ dir: "content/docs" });

export const source = loader({
  baseUrl: "/help/docs",
  source: docs.toFumadocsSource(),
});
