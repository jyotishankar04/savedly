import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { memories, memoryHighlights } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { lookupByUrl, urlKey } from "../memory/inbox.service";
import { createMemory } from "../memory/memory.service";
import type { CreateHighlightInput, UpdateHighlightInput } from "./highlight.schema";

export type Highlight = typeof memoryHighlights.$inferSelect;

/**
 * Copies the memory's highlights (passages and notes) onto memories.highlights_text,
 * which the keyword index (the fts_tokens trigger) reads, so search finds a
 * memory by what was highlighted. The AI vectors are left as ingestion wrote them.
 */
async function syncHighlightsText(memoryId: string): Promise<void> {
  const rows = await db
    .select({ text: memoryHighlights.text, note: memoryHighlights.note })
    .from(memoryHighlights)
    .where(eq(memoryHighlights.memoryId, memoryId))
    .orderBy(asc(memoryHighlights.createdAt));
  const joined = rows.map((r) => (r.note ? `${r.text}\n${r.note}` : r.text)).join("\n\n");
  await db.update(memories).set({ highlightsText: joined || null }).where(eq(memories.id, memoryId));
}

export async function listForMemory(userId: string, memoryId: string): Promise<Highlight[]> {
  return db
    .select()
    .from(memoryHighlights)
    .where(and(eq(memoryHighlights.userId, userId), eq(memoryHighlights.memoryId, memoryId)))
    .orderBy(asc(memoryHighlights.createdAt));
}

/**
 * Highlights a passage on a page. The page's memory is found by its address
 * (the way duplicates are matched); a page that isn't saved yet is saved
 * first, so a highlight always belongs to a memory.
 */
export async function createHighlight(userId: string, input: CreateHighlightInput): Promise<{ highlight: Highlight; memoryId: string; savedPage: boolean }> {
  let memoryId = (await lookupByUrl(userId, input.url))?.id ?? null;
  let savedPage = false;
  if (!memoryId) {
    const memory = await createMemory(userId, { type: "web", url: input.url, title: input.title?.slice(0, 500) || undefined, captureMethod: "extension" });
    memoryId = memory.id;
    savedPage = true;
  }
  const [highlight] = await db
    .insert(memoryHighlights)
    .values({ memoryId, userId, text: input.text, prefix: input.prefix, suffix: input.suffix, color: input.color, note: input.note?.trim() || null })
    .returning();
  await syncHighlightsText(memoryId);
  return { highlight: highlight!, memoryId, savedPage };
}

async function owned(userId: string, id: string): Promise<Highlight> {
  const [row] = await db
    .select()
    .from(memoryHighlights)
    .where(and(eq(memoryHighlights.id, id), eq(memoryHighlights.userId, userId)))
    .limit(1);
  if (!row) throw new AppError("Highlight not found", 404, "HIGHLIGHT_NOT_FOUND");
  return row;
}

export async function updateHighlight(userId: string, id: string, input: UpdateHighlightInput): Promise<Highlight> {
  const current = await owned(userId, id);
  const [row] = await db
    .update(memoryHighlights)
    .set({
      ...(input.color ? { color: input.color } : {}),
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(memoryHighlights.id, id))
    .returning();
  if (input.note !== undefined) await syncHighlightsText(current.memoryId);
  return row!;
}

export async function deleteHighlight(userId: string, id: string): Promise<void> {
  const current = await owned(userId, id);
  await db.delete(memoryHighlights).where(eq(memoryHighlights.id, id));
  await syncHighlightsText(current.memoryId);
}

/** A page's highlights, for showing them again when it's revisited. Empty when the page isn't saved. */
export async function pageHighlights(userId: string, url: string): Promise<{ memoryId: string | null; highlights: Highlight[] }> {
  const memory = await lookupByUrl(userId, url);
  if (!memory) return { memoryId: null, highlights: [] };
  return { memoryId: memory.id, highlights: await listForMemory(userId, memory.id) };
}

/**
 * Hashes of the pages that have highlights (the same urlKey as saved pages),
 * so the extension asks for a page's highlights only when there are some,
 * without telling the server every page that's visited.
 */
export async function highlightedUrlKeys(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ url: memories.normalizedUrl })
    .from(memoryHighlights)
    .innerJoin(memories, eq(memories.id, memoryHighlights.memoryId))
    .where(and(eq(memoryHighlights.userId, userId), eq(memories.inTrash, false), isNotNull(memories.normalizedUrl)));
  return rows.map((r) => urlKey(r.url!));
}
