import { and, eq, isNull, sql } from "drizzle-orm";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { db } from "../../../db";
import { memories, memoryTags, tags } from "../../../db/schema";
import { logger } from "../../../shared/utils/logger";
import { getEmbeddings } from "../ai.providers";
import { getVectorStore } from "../vector-store";
import { getSection } from "../../instance-settings/instance-settings.service";

// Re-index memories for search by meaning, embeddings only: no summarizing,
// tagging or other AI steps, so it doesn't spend anyone's AI allowance. It
// embeds what ingestion already stored (title, summary, intent, tags, the
// user's text and extracted details) — the original page text isn't kept,
// so a link is found by what SaveForLatter understood about it.

// Same splitter settings as nodes/semantic-chunker.ts.
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
  separators: ["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
});

/** Embeds one memory and writes its vectors. Returns false when there's no embeddings key. */
export async function reembedMemory(memoryId: string): Promise<boolean> {
  const [memory] = await db.select().from(memories).where(eq(memories.id, memoryId)).limit(1);
  if (!memory) return true;
  const resolved = await getEmbeddings(memory.userId);
  if (!resolved) return false;

  const tagNames = (
    await db
      .select({ name: tags.name })
      .from(memoryTags)
      .innerJoin(tags, eq(tags.id, memoryTags.tagId))
      .where(eq(memoryTags.memoryId, memoryId))
  ).map((t) => t.name);

  // Mirrors nodes/generate-embeddings.ts's document text.
  const docText = [memory.title, memory.description ?? "", memory.inferredIntent ?? "", `Tags: ${tagNames.join(", ")}`].join("\n");
  const details = Object.entries((memory.extractedFields as Record<string, unknown> | null) ?? {})
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const body = [memory.title, memory.description, memory.content, (memory.keywords ?? []).join(", "), details]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n\n");
  const chunkTexts = body ? await splitter.splitText(body) : [];

  const [documentEmbedding, chunkEmbeddings] = await Promise.all([
    resolved.client.embedQuery(docText),
    chunkTexts.length ? resolved.client.embedDocuments(chunkTexts) : Promise.resolve([] as number[][]),
  ]);

  await (await getVectorStore()).upsertMemoryVectors({
    memoryId,
    userId: memory.userId,
    documentEmbedding,
    chunks: chunkTexts.map((content, index) => ({ index, content, embedding: chunkEmbeddings[index] ?? [] })),
  });
  return true;
}

/**
 * Which memories need indexing. With the built-in pgvector store that's
 * every memory without a document embedding; Upstash and Pinecone keep vectors outside
 * Postgres, so there it's every memory (re-indexing replaces what's there).
 */
async function candidateCondition(userId?: string) {
  const vector = await getSection("vector");
  return and(
    eq(memories.inTrash, false),
    userId ? eq(memories.userId, userId) : undefined,
    vector.provider === "pgvector" ? isNull(memories.documentEmbedding) : undefined,
  );
}

export async function countMemoriesToReindex(): Promise<{ count: number; exact: boolean }> {
  const vector = await getSection("vector");
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(memories).where(await candidateCondition());
  return { count: row?.n ?? 0, exact: vector.provider === "pgvector" };
}

let running = false;

/** Re-indexes in batches; one run at a time per process. */
export async function reindexMemories(options: { userId?: string } = {}): Promise<{ indexed: number; skipped: number; failed: number }> {
  if (running) return { indexed: 0, skipped: 0, failed: 0 };
  running = true;
  const result = { indexed: 0, skipped: 0, failed: 0 };
  try {
    const rows = await db.select({ id: memories.id }).from(memories).where(await candidateCondition(options.userId));
    logger.info({ total: rows.length }, "[reindex] starting");
    for (const { id } of rows) {
      try {
        if (await reembedMemory(id)) result.indexed += 1;
        else result.skipped += 1;
      } catch (err) {
        result.failed += 1;
        logger.warn({ err, memoryId: id }, "[reindex] couldn't index memory");
      }
    }
    logger.info(result, "[reindex] done");
    return result;
  } finally {
    running = false;
  }
}

export function isReindexRunning(): boolean {
  return running;
}
