export interface VectorChunkInput {
  index: number;
  content: string;
  embedding: number[];
  tokenCount?: number;
}

export interface VectorUpsertInput {
  memoryId: string;
  userId: string;
  documentEmbedding: number[];
  chunks: VectorChunkInput[];
}

export interface VectorSearchResult {
  memoryId: string;
  score: number;
}

export interface VectorChunkSearchResult {
  /** memory_chunks.id — the merge key for RAG's chunk-level RRF (multiple
   *  chunks can share a memoryId, so memoryId alone can't be the key). */
  chunkId: string;
  memoryId: string;
  content: string;
  score: number;
}

/**
 * Where a memory's embeddings actually live — pgvector columns on the
 * primary DB for local/dev, Upstash Vector for production (see
 * VECTOR_STORE_PROVIDER in src/config/env.ts).
 */
export interface VectorStore {
  upsertMemoryVectors(input: VectorUpsertInput): Promise<void>;
  deleteMemoryVectors(memoryId: string): Promise<void>;
  /**
   * Nearest-neighbor search against each memory's document-level embedding,
   * scoped to userId and in_trash=false. Returns up to `limit` results
   * ordered best-first by cosine similarity (higher = more similar). Does
   * NOT know about isFavorite/isArchived/collectionId/tag/type facets —
   * callers needing those must post-filter (see ../search/).
   */
  searchByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorSearchResult[]>;
  /**
   * Nearest-neighbor search against per-chunk embeddings — passage-level
   * retrieval for the "Ask Savedly" RAG agent (see ../rag/), unlike
   * searchByEmbedding above which is document-level for the Search feature.
   * Same userId/in_trash=false scoping, same best-first cosine ordering.
   */
  searchChunksByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorChunkSearchResult[]>;
}
