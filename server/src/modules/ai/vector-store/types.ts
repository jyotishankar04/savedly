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
  /** memory_chunks.id: the merge key for chunk-level RRF (a memoryId can have several chunks). */
  chunkId: string;
  memoryId: string;
  content: string;
  score: number;
}

/** Where a memory's embeddings live (VECTOR_STORE_PROVIDER). */
export interface VectorStore {
  upsertMemoryVectors(input: VectorUpsertInput): Promise<void>;
  deleteMemoryVectors(memoryId: string): Promise<void>;
  /**
   * Nearest-neighbor over document embeddings, scoped to the user and not trashed, best-first by
   * cosine. No facets: callers post-filter (../search/).
   */
  searchByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorSearchResult[]>;
  /** Nearest-neighbor over chunk embeddings for Ask (../rag/); same scoping and ordering. */
  searchChunksByEmbedding(userId: string, embedding: number[], limit: number): Promise<VectorChunkSearchResult[]>;
}
