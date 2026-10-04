import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../../../db";
import { memories, memoryChunks } from "../../../db/schema";
import type { VectorStore, VectorUpsertInput } from "./types";

export const pgVectorStore: VectorStore = {
  async upsertMemoryVectors({ memoryId, userId, documentEmbedding, chunks }: VectorUpsertInput) {
    await db.transaction(async (tx) => {
      await tx.update(memories).set({ documentEmbedding }).where(eq(memories.id, memoryId));

      // Re-ingestion is delete-all + reinsert, same pattern as tags/collections/attachments.
      await tx.delete(memoryChunks).where(eq(memoryChunks.memoryId, memoryId));
      if (chunks.length > 0) {
        await tx.insert(memoryChunks).values(
          chunks.map((chunk) => ({
            memoryId,
            userId,
            chunkIndex: chunk.index,
            chunkContent: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding: chunk.embedding,
          })),
        );
      }
    });
  },

  async deleteMemoryVectors() {
    // No-op — memory_chunks.memoryId FK cascades on delete, and
    // memories.document_embedding is a column on the row being deleted.
  },

  async searchByEmbedding(userId, embedding, limit) {
    // pgvector's <=> operator has no first-class drizzle API — same reason
    // pgvector-type.ts's toDriver already hand-writes this bracket-join
    // vector literal for writes. <=> is cosine *distance*; 1 - distance
    // converts to similarity, matching the HNSW index's vector_cosine_ops.
    const vectorLiteral = `[${embedding.join(",")}]`;
    const rows = await db
      .select({
        id: memories.id,
        score: sql<number>`1 - (${memories.documentEmbedding} <=> ${vectorLiteral}::vector)`.as("score"),
      })
      .from(memories)
      .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false), isNotNull(memories.documentEmbedding)))
      .orderBy(sql`${memories.documentEmbedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((row) => ({ memoryId: row.id, score: row.score }));
  },

  async searchChunksByEmbedding(userId, embedding, limit) {
    const vectorLiteral = `[${embedding.join(",")}]`;
    const rows = await db
      .select({
        chunkId: memoryChunks.id,
        memoryId: memoryChunks.memoryId,
        content: memoryChunks.chunkContent,
        score: sql<number>`1 - (${memoryChunks.embedding} <=> ${vectorLiteral}::vector)`.as("score"),
      })
      .from(memoryChunks)
      .innerJoin(memories, eq(memoryChunks.memoryId, memories.id))
      .where(and(eq(memoryChunks.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)))
      .orderBy(sql`${memoryChunks.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows;
  },
};
