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
 * Where a memory's embeddings live: pgvector locally, Upstash or Pinecone in production
 * (VECTOR_STORE_PROVIDER).
 */
export interface VectorStore {
  upsertMemoryVectors(input: VectorUpsertInput): Promise<void>;
  deleteMemoryVectors(memoryId: string): Promise<void>;
  /**
   * Nearest-neighbor over document-level embeddings, scoped to userId and not trashed, best-first
   * by cosine similarity. Doesn't know facets (favorite, archive, collection, tag, type); callers
   * post-filter (see ../search/).
   */
  searchByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorSearchResult[]>;
  /**
   * Nearest-neighbor over per-chunk embeddings for the Ask agent (../rag/), versus
   * searchByEmbedding's document level. Same scoping and ordering.
   */
  searchChunksByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorChunkSearchResult[]>;
}
