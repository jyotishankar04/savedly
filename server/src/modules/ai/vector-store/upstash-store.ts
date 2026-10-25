import { Index } from "@upstash/vector";
import type { VectorStore, VectorUpsertInput } from "./types";
import { chunkVectorId, documentVectorId } from "./vector-ids";

// IDs start with the memory ID so all of a memory's vectors can be deleted by prefix; Upstash
// doesn't know about our FK cascades.
export function createUpstashVectorStore(config: { url: string; token: string }): VectorStore {
  const index = new Index({ url: config.url, token: config.token });

  return {
    async upsertMemoryVectors({ memoryId, userId, documentEmbedding, chunks }: VectorUpsertInput) {
      // Re-ingestion is delete-all + reinsert, same pattern as the pgvector store.
      await index.delete({ prefix: `${memoryId}:` });

      await index.upsert([
        {
          id: documentVectorId(memoryId),
          vector: documentEmbedding,
          metadata: { memoryId, userId, kind: "document" as const },
        },
        ...chunks.map((chunk) => ({
          id: chunkVectorId(memoryId, chunk.index),
          vector: chunk.embedding,
          metadata: {
            memoryId,
            userId,
            kind: "chunk" as const,
            chunkIndex: chunk.index,
            content: chunk.content,
          },
        })),
      ]);
    },

    async deleteMemoryVectors(memoryId: string) {
      await index.delete({ prefix: `${memoryId}:` });
    },

    async searchByEmbedding(userId, embedding, limit) {
      // kind='document' selects the one summary vector per memory, not the chunk vectors in the
      // same index. memoryId comes from metadata, not the id string.
      const results = await index.query<{ memoryId: string; userId: string; kind: string }>({
        vector: embedding,
        topK: limit,
        filter: `kind = 'document' and userId = '${userId}'`,
        includeMetadata: true,
      });

      return results
        .filter((r) => r.metadata?.memoryId)
        .map((r) => ({ memoryId: r.metadata!.memoryId, score: r.score }));
    },

    async searchChunksByEmbedding(userId, embedding, limit) {
      // content lives in metadata already (see upsertMemoryVectors above) —
      // no Postgres round-trip needed to get the chunk text itself.
      const results = await index.query<{
        memoryId: string;
        userId: string;
        kind: string;
        chunkIndex: number;
        content: string;
      }>({
        vector: embedding,
        topK: limit,
        filter: `kind = 'chunk' and userId = '${userId}'`,
        includeMetadata: true,
      });

      return results
        .filter((r) => r.metadata?.memoryId && r.metadata?.content !== undefined)
        .map((r) => ({
          chunkId: chunkVectorId(r.metadata!.memoryId, r.metadata!.chunkIndex),
          memoryId: r.metadata!.memoryId,
          content: r.metadata!.content,
          score: r.score,
        }));
    },
  };
}
