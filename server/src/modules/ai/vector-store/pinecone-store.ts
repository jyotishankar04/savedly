import type { VectorStore, VectorUpsertInput } from "./types";

// Pinecone, over its REST API (no SDK needed for four calls). Works with a
// serverless index created with the embedding model's dimension (1536 for
// text-embedding-3-small) and the cosine metric — scores are then cosine
// similarity, like the other stores.

const API_VERSION = "2025-04";
// A request is capped at 2 MB; 1536 floats as JSON is roughly 20 KB a vector.
const UPSERT_BATCH = 50;
const DELETE_BATCH = 1000;

// IDs are prefixed with the memory ID so a whole memory's vectors (document +
// every chunk) can be found again with a prefix listing — Pinecone doesn't
// know about our Postgres FK cascades, so that's how a deleted or re-ingested
// memory's vectors get cleaned up.
function documentVectorId(memoryId: string): string {
  return `${memoryId}:document`;
}

function chunkVectorId(memoryId: string, chunkIndex: number): string {
  return `${memoryId}:chunk:${chunkIndex}`;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: { memoryId?: string; userId?: string; kind?: string; chunkIndex?: number; content?: string };
}

export interface PineconeConfig {
  apiKey: string;
  /** The index's own host, from the Pinecone console (e.g. my-index-abc123.svc.aped-1234.pinecone.io). */
  host: string;
}

/** A small client for one Pinecone index. Exported for the admin "Test connection" check. */
export function pineconeClient(config: PineconeConfig) {
  const base = `https://${config.host.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  async function request<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: init.method,
      headers: {
        "Api-Key": config.apiKey,
        "X-Pinecone-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`Pinecone ${init.method} ${path.split("?")[0]} failed (${res.status}): ${detail}`);
    }
    return (await res.json()) as T;
  }

  return {
    stats: () => request<{ dimension?: number; totalVectorCount?: number }>("/describe_index_stats", { method: "POST", body: {} }),

    upsert: (vectors: { id: string; values: number[]; metadata: Record<string, unknown> }[]) =>
      request<unknown>("/vectors/upsert", { method: "POST", body: { vectors } }),

    query: (vector: number[], topK: number, filter: Record<string, unknown>) =>
      request<{ matches?: PineconeMatch[] }>("/query", { method: "POST", body: { vector, topK, filter, includeMetadata: true } }),

    /** Every vector ID starting with `prefix` (paged; serverless indexes only). */
    async listIds(prefix: string): Promise<string[]> {
      const ids: string[] = [];
      let token: string | undefined;
      do {
        const params = new URLSearchParams({ prefix, limit: "100" });
        if (token) params.set("paginationToken", token);
        const page = await request<{ vectors?: { id: string }[]; pagination?: { next?: string } }>(`/vectors/list?${params}`, { method: "GET" });
        ids.push(...(page.vectors ?? []).map((v) => v.id));
        token = page.pagination?.next;
      } while (token);
      return ids;
    },

    async deleteIds(ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i += DELETE_BATCH) {
        await request<unknown>("/vectors/delete", { method: "POST", body: { ids: ids.slice(i, i + DELETE_BATCH) } });
      }
    },
  };
}

export function createPineconeVectorStore(config: PineconeConfig): VectorStore {
  const client = pineconeClient(config);

  async function deleteMemory(memoryId: string, keep: Set<string> = new Set()): Promise<void> {
    const stale = (await client.listIds(`${memoryId}:`)).filter((id) => !keep.has(id));
    if (stale.length > 0) await client.deleteIds(stale);
  }

  return {
    async upsertMemoryVectors({ memoryId, userId, documentEmbedding, chunks }: VectorUpsertInput) {
      const vectors = [
        { id: documentVectorId(memoryId), values: documentEmbedding, metadata: { memoryId, userId, kind: "document" } },
        ...chunks.map((chunk) => ({
          id: chunkVectorId(memoryId, chunk.index),
          values: chunk.embedding,
          metadata: { memoryId, userId, kind: "chunk", chunkIndex: chunk.index, content: chunk.content },
        })),
      ];
      // Write first (an upsert replaces a vector with the same ID), then drop
      // whatever is left over from an earlier, longer version of the memory —
      // so a re-ingest never leaves the memory unsearchable in between.
      for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
        await client.upsert(vectors.slice(i, i + UPSERT_BATCH));
      }
      await deleteMemory(memoryId, new Set(vectors.map((v) => v.id)));
    },

    async deleteMemoryVectors(memoryId: string) {
      await deleteMemory(memoryId);
    },

    async searchByEmbedding(userId, embedding, limit) {
      // kind='document' scopes this to the one summary-level vector per memory.
      const { matches = [] } = await client.query(embedding, limit, { kind: { $eq: "document" }, userId: { $eq: userId } });
      return matches.filter((m) => m.metadata?.memoryId).map((m) => ({ memoryId: m.metadata!.memoryId!, score: m.score }));
    },

    async searchChunksByEmbedding(userId, embedding, limit) {
      // The chunk text lives in metadata, so no Postgres round-trip is needed.
      const { matches = [] } = await client.query(embedding, limit, { kind: { $eq: "chunk" }, userId: { $eq: userId } });
      return matches
        .filter((m) => m.metadata?.memoryId && m.metadata.content !== undefined && m.metadata.chunkIndex !== undefined)
        .map((m) => ({
          chunkId: chunkVectorId(m.metadata!.memoryId!, m.metadata!.chunkIndex!),
          memoryId: m.metadata!.memoryId!,
          content: m.metadata!.content!,
          score: m.score,
        }));
    },
  };
}
