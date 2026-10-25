import { and, inArray, type SQL } from "drizzle-orm";
import { db } from "../../../db";
import { memories } from "../../../db/schema";
import { lexicalSearch } from "./lexical-search";
import { semanticSearch } from "./semantic-search";
import { rrfMerge, SEMANTIC_SIMILARITY_FLOOR, type RankedResult } from "./rrf";

export interface HybridSearchParams {
  userId: string;
  /** Already trimmed, already known non-empty. */
  query: string;
  /**
   * The same SQL[] the list path builds, used as the lexical leg's WHERE and re-checked against the
   * semantic leg's candidates.
   */
  filterConditions: SQL[];
  candidateLimit: number;
}

/**
 * Runs both legs in parallel and RRF-merges (k=60) into a ranked memoryId list; the caller owns fetching full rows.
 * The semantic leg gets a facet post-filter the lexical leg doesn't need: lexical queries Postgres directly, but Upstash metadata doesn't mirror mutable facets (favorite, collection, tag), so filterConditions are re-checked with one small query on the semantic candidates.
 * Known tradeoff: with Upstash and a narrow facet filter, a true match could miss the global top-K cut. pgvector is unaffected. Follow-up: mirror `type` into Upstash metadata if it proves real.
 */
export async function hybridSearch({
  userId,
  query,
  filterConditions,
  candidateLimit,
}: HybridSearchParams): Promise<RankedResult[]> {
  const [lexicalResults, semanticResultsRaw] = await Promise.all([
    lexicalSearch(query, filterConditions, candidateLimit),
    semanticSearch(userId, query, candidateLimit),
  ]);

  const semanticAboveFloor = semanticResultsRaw.filter((r) => r.score >= SEMANTIC_SIMILARITY_FLOOR);

  let semanticFiltered = semanticAboveFloor;
  if (semanticAboveFloor.length > 0) {
    const candidateIds = semanticAboveFloor.map((r) => r.memoryId);
    const allowedRows = await db
      .select({ id: memories.id })
      .from(memories)
      .where(and(...filterConditions, inArray(memories.id, candidateIds)));
    const allowed = new Set(allowedRows.map((r) => r.id));
    semanticFiltered = semanticAboveFloor.filter((r) => allowed.has(r.memoryId));
  }

  return rrfMerge(semanticFiltered, lexicalResults);
}
