import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db";
import { memories } from "../../../db/schema";
import { getEmbeddings } from "../ai.providers";
import { getVectorStore } from "../vector-store";
import { rrfMerge, SEMANTIC_SIMILARITY_FLOOR } from "../search/rrf";
import { MIN_SEMANTIC_QUERY_LENGTH } from "../search/semantic-search";
import { lexicalSearch } from "../search/lexical-search";
import { logAiUsage } from "../../ai-usage/usage-logger";
import { logger } from "../../../shared/utils/logger";

export interface RetrievedMemory {
  memoryId: string;
  title: string;
  type: string;
  source: string | null;
  url: string | null;
  faviconUrl: string | null;
  snippet: string;
  score: number;
}

interface ChunkLegResult {
  chunkId: string;
  memoryId: string;
  content: string;
  score: number;
}

/**
 * Lexical leg for chunks, Postgres-only (mirrors search/lexical-search.ts's
 * "always Postgres" note) — computed on the fly rather than a precomputed
 * tsvector column like memories.ftsTokens (DB-trigger-generated). memory_chunks
 * has no equivalent column, and adding one is a real migration; chunk volume
 * per user is small enough for this first pass to skip it. Revisit if this
 * proves slow once real chunk volume/traffic exists (same tradeoff style as
 * SEMANTIC_SIMILARITY_FLOOR's comment in rrf.ts).
 */
async function chunkLexicalSearch(userId: string, queryText: string, limit: number): Promise<ChunkLegResult[]> {
  const tsQuery = sql`plainto_tsquery('english', ${queryText})`;
  const rows = await db.execute<{ chunk_id: string; memory_id: string; content: string; score: number }>(sql`
    SELECT mc.id AS chunk_id, mc.memory_id, mc.chunk_content AS content,
           ts_rank_cd(to_tsvector('english', mc.chunk_content), ${tsQuery}) AS score
    FROM memory_chunks mc
    INNER JOIN memories m ON m.id = mc.memory_id
    WHERE mc.user_id = ${userId}
      AND m.in_trash = false
      AND m.is_vaulted = false
      AND to_tsvector('english', mc.chunk_content) @@ ${tsQuery}
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    chunkId: row.chunk_id,
    memoryId: row.memory_id,
    content: row.content,
    score: row.score,
  }));
}

/**
 * Never throws — degrades to an empty leg on failure, matching this
 * codebase's ingestion-wide "degrade, don't fail" convention (see
 * search/semantic-search.ts).
 */
async function chunkSemanticSearch(userId: string, queryText: string, limit: number): Promise<ChunkLegResult[]> {
  if (queryText.length < MIN_SEMANTIC_QUERY_LENGTH) return [];

  const resolved = await getEmbeddings(userId);
  if (!resolved) return [];

  try {
    const embedding = await resolved.client.embedQuery(queryText);
    void logAiUsage({ userId, requestType: "embedding:query", provider: resolved.provider, model: resolved.model });
    const results = await (await getVectorStore()).searchChunksByEmbedding(userId, embedding, limit);
    return results.map((r) => ({ chunkId: r.chunkId, memoryId: r.memoryId, content: r.content, score: r.score }));
  } catch (err) {
    logger.error({ err, userId }, "chunkSemanticSearch: leg failed, degrading to lexical-only");
    return [];
  }
}

/**
 * Chunk-level hybrid retrieval for the "Ask SaveForLatter" RAG agent's
 * searchMemories tool. Unlike search/hybrid-search.ts (memory-level, built
 * for the Search page), this retrieves passages, then rolls the winners up
 * to their parent memories — each memory appears once, represented by its
 * single best-scoring chunk as the snippet.
 */
export async function chunkHybridSearch(userId: string, query: string, limit: number): Promise<RetrievedMemory[]> {
  const candidateLimit = limit * 4;

  const [semanticResultsRaw, lexicalResults] = await Promise.all([
    chunkSemanticSearch(userId, query, candidateLimit),
    chunkLexicalSearch(userId, query, candidateLimit),
  ]);

  const semanticFiltered = semanticResultsRaw.filter((r) => r.score >= SEMANTIC_SIMILARITY_FLOOR);

  const contentByChunkId = new Map<string, ChunkLegResult>();
  for (const r of [...semanticFiltered, ...lexicalResults]) contentByChunkId.set(r.chunkId, r);

  const merged = rrfMerge(
    semanticFiltered.map((r) => ({ memoryId: r.chunkId, score: r.score })),
    lexicalResults.map((r) => ({ memoryId: r.chunkId, score: r.score })),
  );

  // Roll up to one result per memory (best-ranked chunk wins), preserving
  // RRF order.
  const bestChunkByMemory = new Map<string, { chunkId: string; rrfScore: number }>();
  for (const { memoryId: chunkId, rrfScore } of merged) {
    const chunk = contentByChunkId.get(chunkId);
    if (!chunk) continue;
    if (!bestChunkByMemory.has(chunk.memoryId)) {
      bestChunkByMemory.set(chunk.memoryId, { chunkId, rrfScore });
    }
  }

  const topMemoryIds = [...bestChunkByMemory.keys()].slice(0, limit);
  if (topMemoryIds.length === 0) return memoryKeywordFallback(userId, query, limit);

  const memoryRows = await db
    .select({
      id: memories.id,
      title: memories.title,
      type: memories.type,
      source: memories.source,
      url: memories.url,
      faviconUrl: memories.faviconUrl,
    })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, topMemoryIds)));
  const memoryById = new Map(memoryRows.map((m) => [m.id, m]));

  const results: RetrievedMemory[] = [];
  for (const memoryId of topMemoryIds) {
    const memory = memoryById.get(memoryId);
    const best = bestChunkByMemory.get(memoryId);
    if (!memory || !best) continue;
    const chunk = contentByChunkId.get(best.chunkId);
    results.push({
      memoryId,
      title: memory.title,
      type: memory.type,
      source: memory.source,
      url: memory.url,
      faviconUrl: memory.faviconUrl,
      snippet: chunk?.content ?? "",
      score: best.rrfScore,
    });
  }

  return results;
}

/**
 * When no chunk matches — typically because nothing has embeddings yet, so
 * memory_chunks is empty — search whole memories by keyword (the
 * trigger-maintained memories.fts_tokens) and hand back their summary and
 * text as the passage. Ask can still answer from exact words that way.
 */
async function memoryKeywordFallback(userId: string, query: string, limit: number): Promise<RetrievedMemory[]> {
  const hits = await lexicalSearch(
    query,
    [eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)],
    limit,
  ).catch((err) => {
    logger.warn({ err, userId }, "[ask] keyword fallback failed");
    return [];
  });
  if (hits.length === 0) return [];

  const rows = await db
    .select({
      id: memories.id,
      title: memories.title,
      type: memories.type,
      source: memories.source,
      url: memories.url,
      faviconUrl: memories.faviconUrl,
      description: memories.description,
      content: memories.content,
    })
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, hits.map((h) => h.memoryId))));
  const byId = new Map(rows.map((row) => [row.id, row]));

  return hits.flatMap((hit) => {
    const memory = byId.get(hit.memoryId);
    if (!memory) return [];
    const snippet = [memory.description, memory.content].filter(Boolean).join("\n\n").slice(0, 1500);
    return [
      {
        memoryId: memory.id,
        title: memory.title,
        type: memory.type,
        source: memory.source,
        url: memory.url,
        faviconUrl: memory.faviconUrl,
        snippet,
        score: hit.score,
      },
    ];
  });
}
