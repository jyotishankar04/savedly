import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { webSearch } from "../../web-search/web-search";
import { ragToolContextSchema } from "./search-memories";

// Lookups per question: each one is a paid search and a monthly lookup, and
// the model tends to keep refining. Counted by turn, forgotten after a while.
const MAX_PER_TURN = 2;
const perTurn = new Map<string, { count: number; at: number }>();
function takeTurnSlot(turnId: string | undefined): boolean {
  if (!turnId) return true;
  const now = Date.now();
  for (const [id, entry] of perTurn) if (now - entry.at > 30 * 60 * 1000) perTurn.delete(id);
  const entry = perTurn.get(turnId) ?? { count: 0, at: now };
  if (entry.count >= MAX_PER_TURN) return false;
  perTurn.set(turnId, { count: entry.count + 1, at: entry.at });
  return true;
}

const inputSchema = z.object({
  query: z.string().min(2).max(200).describe("A plain web search, as you'd type it into a search engine."),
});

/**
 * Web search for Ask, for facts the user's saved memories don't hold: more
 * about something they saved (who made the film, what the app does now), or
 * a lookup they asked for. Counts toward the plan's monthly web lookups. The
 * answer must say it came from the web (AGENT_SYSTEM_PROMPT, "THE WEB").
 */
export const searchWebTool = tool(
  async ({ query }: z.infer<typeof inputSchema>, runtime: ToolRuntime<unknown, typeof ragToolContextSchema>) => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("search_web: missing userId in runtime context");
    if (!takeTurnSlot(runtime.context?.turnId)) {
      return { available: false, reason: "enough", message: "That's the web searches for this question. Answer with what you've found." };
    }
    const outcome = await webSearch(userId, query, { requestType: "rag:search_web", threadId: runtime.context?.threadId ?? null });
    if (!outcome.ok) return { available: false, reason: outcome.reason, message: outcome.message };
    return { available: true, query, results: outcome.results };
  },
  {
    name: "search_web",
    description:
      "Search the web. Use it only after search_memories, when the user's saved memories don't hold the answer: to learn more about something they saved (who directed a film they saved, what a saved tool does), or when they ask you to look something up. Call it directly when the question needs it; never ask the user's permission first. Returns titles, URLs and snippets. Each call uses one of the user's monthly web lookups, so search once, twice at most, per question.",
    schema: inputSchema,
  },
);
