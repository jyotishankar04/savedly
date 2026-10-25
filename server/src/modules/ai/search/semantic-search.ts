import { getEmbeddings } from "../models";
import { getVectorStore } from "../vector-store";
import { logAiUsage } from "../../ai-usage/api";
import { logger } from "../../../shared/utils/logger";
import type { SearchLegResult } from "./types";

// Below this, embedding the query wastes cost; the lexical leg handles short queries.
export const MIN_SEMANTIC_QUERY_LENGTH = 3;

/**
 * Never throws: an embeddings or vector-store failure degrades to an empty leg, so hybridSearch
 * continues lexical-only.
 */
export async function semanticSearch(userId: string, queryText: string, limit: number): Promise<SearchLegResult[]> {
  if (queryText.length < MIN_SEMANTIC_QUERY_LENGTH) return [];

  const resolved = await getEmbeddings(userId);
  if (!resolved) return [];

  try {
    const embedding = await resolved.client.embedQuery(queryText);
    void logAiUsage({ userId, requestType: "embedding:query", provider: resolved.provider, model: resolved.model });
    return await (await getVectorStore()).searchByEmbedding(userId, embedding, limit);
  } catch (err) {
    logger.error({ err, userId }, "semanticSearch: leg failed, degrading to lexical-only");
    return [];
  }
}
