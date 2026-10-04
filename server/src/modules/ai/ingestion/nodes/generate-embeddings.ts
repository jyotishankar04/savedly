import { getEmbeddings } from "../../ai.providers";
import { logAiUsage } from "../../../ai-usage/usage-logger";
import { logNode } from "../log";
import { logger } from "../../../../shared/utils/logger";
import type { IngestionStateType, IngestionUpdate } from "../state";

// Verbatim from docs/AI_REQUIREMENTS.md's GenerateEmbeddings node: one
// document-level embedding from title+summary+intent+tags, plus one
// embedding per chunk.
// Warned once per process: without embeddings, nothing saved is findable by
// meaning, and Ask has only keyword matches to go on.
let warnedNoEmbeddings = false;

export async function generateEmbeddings(state: IngestionStateType): Promise<IngestionUpdate> {
  const resolved = await getEmbeddings(state.userId);
  if (!resolved) {
    logNode(state.memoryId, "generateEmbeddings", { skipped: "AI not configured" });
    if (!warnedNoEmbeddings) {
      warnedNoEmbeddings = true;
      logger.warn(
        "[ingestion] no embeddings key: saves aren't indexed for search by meaning. Set Admin -> Infrastructure -> Embeddings (or Included AI on OpenAI).",
      );
    }
    return { documentEmbedding: [], chunkEmbeddings: [] };
  }

  const docText = [
    state.aiTitle ?? "",
    state.aiSummary ?? "",
    state.inferredIntent ?? "",
    `Tags: ${state.suggestedTags.join(", ")}`,
  ].join("\n");
  const chunkTexts = state.chunks.map((chunk) => chunk.content);

  const [documentEmbedding, chunkEmbeddings] = await Promise.all([
    resolved.client.embedQuery(docText),
    chunkTexts.length > 0 ? resolved.client.embedDocuments(chunkTexts) : Promise.resolve([]),
  ]);

  logNode(state.memoryId, "generateEmbeddings", {
    documentEmbeddingDims: documentEmbedding.length,
    chunkEmbeddingCount: chunkEmbeddings.length,
  });

  // OpenAIEmbeddings doesn't surface token usage through LangChain.js —
  // log a call-count row (no token fields) rather than a real count.
  void logAiUsage({
    userId: state.userId,
    requestType: "embedding:document",
    provider: resolved.provider,
    model: resolved.model,
    memoryId: state.memoryId,
    metadata: { calls: 1 + (chunkTexts.length > 0 ? 1 : 0), chunkCount: chunkTexts.length },
  });

  return { documentEmbedding, chunkEmbeddings };
}
