import { and, desc, eq, gte, lt } from "drizzle-orm";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../../../db";
import { memories } from "../../../../db/schema";
import { ragToolContextSchema, searchMemoriesResultSchema, type SearchMemoriesResult } from "./search-memories";
import { startOfLocalDay, userTimeZone } from "../../../../shared/utils/time-zone";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

const inputSchema = z.object({
  date: dateSchema.describe(
    "Start of the date range to search, as YYYY-MM-DD. Resolve relative terms like \"today\", \"yesterday\", or \"last week\" to an absolute date yourself using the current date given in your system prompt — never pass the word itself.",
  ),
  endDate: dateSchema
    .optional()
    .describe("End of the range (inclusive), YYYY-MM-DD. Omit for a single day — pass only `date` for \"what did I save yesterday\"."),
  limit: z.number().int().positive().max(30).optional().describe("Max results to return. Defaults to 8 — a busy day can easily have 15+ saves, and a long, detailed list is slow to read and slow to generate. Only raise this if the user explicitly asks to see more."),
});

/**
 * Calendar-day boundaries in the user's own time zone (memories.createdAt
 * is UTC), so "yesterday" is their yesterday, not the UTC one.
 */
function dayRange(date: string, endDate: string | undefined, timeZone: string): { start: Date; end: Date } {
  const start = startOfLocalDay(date, timeZone);
  const lastDay = new Date(`${endDate ?? date}T00:00:00.000Z`);
  const dayAfter = new Date(lastDay.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { start, end: startOfLocalDay(dayAfter, timeZone) };
}

export const searchMemoriesByDateTool = tool(
  async (
    { date, endDate, limit = 8 }: z.infer<typeof inputSchema>,
    runtime: ToolRuntime<unknown, typeof ragToolContextSchema>,
  ): Promise<SearchMemoriesResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("search_memories_by_date: missing userId in runtime context");

    const { start, end } = dayRange(date, endDate, await userTimeZone(userId));

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
      .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false), gte(memories.createdAt, start), lt(memories.createdAt, end)))
      .orderBy(desc(memories.createdAt))
      .limit(limit);

    const label = endDate && endDate !== date ? `${date} to ${endDate}` : date;

    // Validated (not just TS-cast) — matches search_memories' own tool,
    // catches a malformed internal result before it reaches the model or
    // the client (both tools share this result shape/schema so the same
    // client-side rendering — SearchToolPart, Sources sidebar, Referenced
    // cards — handles either one identically).
    return searchMemoriesResultSchema.parse({
      query: label,
      memories: rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        source: row.source,
        url: row.url,
        faviconUrl: row.faviconUrl,
        // Shorter than search_memories' chunk-derived snippets — a date
        // listing already asks the model to summarize many items at once
        // (see the DATE-BASED REQUESTS prompt section), so keeping each
        // item's raw context small matters more here for response latency.
        snippet: (row.description ?? row.content ?? "").slice(0, 160),
      })),
    });
  },
  {
    name: "search_memories_by_date",
    description:
      "Find memories the user saved on a specific date or date range (e.g. \"what did I save yesterday\", \"show me everything from last Tuesday\", \"what did I save between March 1st and 5th\"). Filters by when the memory was saved, not by content relevance — use search_memories instead for topic/keyword questions. Returns an empty `memories` array if nothing was saved in that range.",
    schema: inputSchema,
  },
);
