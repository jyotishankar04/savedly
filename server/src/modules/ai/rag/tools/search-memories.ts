import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { chunkHybridSearch } from "../chunk-search";

// A zod object (not a plain TS interface) so ToolRuntime's context generic
// resolves it via its InteropZodObject branch — a bare interface didn't
// type-check (runtime.context.userId came back as a property of `{}`).
// turnId: one per question (streamAsk), so a tool can tell calls in the
// same answer apart from later ones.
export const ragToolContextSchema = z.object({ userId: z.string(), turnId: z.string().optional() });
export type RAGToolContext = z.infer<typeof ragToolContextSchema>;

// Doubles as the documented shape a future client-side generative-UI
// renderer can rely on (mirrors codersgpt-genai's {query, products} pattern —
// a tool's structured return is what a message renderer pattern-matches on
// to show something richer than plain text, e.g. memory result cards built
// from the already-installed Attachment component).
export const searchMemoriesResultSchema = z.object({
  query: z.string(),
  memories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      source: z.string().nullable(),
      url: z.string().nullable(),
      faviconUrl: z.string().nullable(),
      snippet: z.string(),
    }),
  ),
});

export type SearchMemoriesResult = z.infer<typeof searchMemoriesResultSchema>;

const inputSchema = z.object({
  query: z.string().min(1).describe("What to search for in the user's saved memories — a natural-language description, not just keywords."),
  limit: z.number().int().positive().max(20).optional().describe("Max results to return. Defaults to 6."),
});

export const searchMemoriesTool = tool(
  async ({ query, limit = 6 }: z.infer<typeof inputSchema>, runtime: ToolRuntime<unknown, typeof ragToolContextSchema>): Promise<SearchMemoriesResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("search_memories: missing userId in runtime context");

    const results = await chunkHybridSearch(userId, query, limit);

    // Validated (not just TS-cast) — a malformed internal result should
    // never silently reach the model or a future client renderer.
    return searchMemoriesResultSchema.parse({
      query,
      memories: results.map((r) => ({
        id: r.memoryId,
        title: r.title,
        type: r.type,
        source: r.source,
        url: r.url,
        faviconUrl: r.faviconUrl,
        snippet: r.snippet,
      })),
    });
  },
  {
    name: "search_memories",
    description:
      "Search the user's saved memories (links, notes, images, documents, voice memos they've captured) for content relevant to a question. Returns an empty `memories` array if nothing relevant is found — in that case, tell the user honestly rather than guessing. Not for \"things like / related to / similar to <a specific memory>\": searching for that memory only returns the memory itself — call find_related instead.",
    schema: inputSchema,
  },
);
