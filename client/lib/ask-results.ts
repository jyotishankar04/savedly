import type { UIMessage } from "ai";
import type { ThreadMessage } from "@/lib/ask";

/** search_memories (topic/keyword) and search_memories_by_date (a day or
 * date range, see the server's rag/tools/search-memories-by-date.ts) both
 * return the same {query, memories} shape — so the same marker, cards, and
 * Sources/Referenced sections render either one's result identically. */
export function isMemorySearchToolName(name: string): boolean {
  return name === "search_memories" || name === "search_memories_by_date";
}

export interface SearchMemoriesResult {
  query: string;
  memories: {
    id: string;
    title: string;
    type: string;
    source: string | null;
    url: string | null;
    faviconUrl: string | null;
    snippet: string;
  }[];
}

export function parseToolOutput(output: unknown): SearchMemoriesResult | null {
  try {
    const kwargs = (output as { kwargs?: { content?: string } })?.kwargs;
    if (!kwargs?.content) return null;
    return JSON.parse(kwargs.content) as SearchMemoriesResult;
  } catch {
    return null;
  }
}

/** memory.source is usually null in practice; fall back to the URL's
 * hostname (cleaner than a random mid-sentence fragment of the raw
 * chunk snippet) before falling back to the snippet itself. */
export function getCardDescription(memory: SearchMemoriesResult["memories"][number]): string {
  if (memory.source) return memory.source;
  if (memory.url) {
    try {
      return new URL(memory.url).hostname.replace(/^www\./, "");
    } catch {
      // not a valid absolute URL — fall through to the snippet
    }
  }
  return memory.snippet.replace(/\s+/g, " ").trim();
}

/** Dedupes memories across every search_memories call in one assistant
 * turn — the sources sidebar reflects everything that could have informed
 * the answer, not just the last search. */
function collectCitedMemories(parts: UIMessage["parts"]): SearchMemoriesResult["memories"] {
  const byId = new Map<string, SearchMemoriesResult["memories"][number]>();
  for (const part of parts) {
    if (part.type !== "dynamic-tool" || !isMemorySearchToolName(part.toolName) || part.state !== "output-available") continue;
    const result = parseToolOutput(part.output);
    if (!result) continue;
    for (const memory of result.memories) byId.set(memory.id, memory);
  }
  return [...byId.values()];
}

/** Only the memories the answer text actually names (by URL or title) — the
 * search tool often turns up more candidates than the model ends up using.
 * Rendered inline below the response; distinct from the Sources sidebar
 * (getCurrentSources below), which intentionally keeps showing everything
 * the search found, referenced or not. */
export function getReferencedMemories(parts: UIMessage["parts"]): SearchMemoriesResult["memories"] {
  const cited = collectCitedMemories(parts);
  if (cited.length === 0) return cited;
  const answerText = parts
    .filter((p): p is Extract<(typeof parts)[number], { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  if (!answerText) return [];
  return cited.filter((memory) => (memory.url && answerText.includes(memory.url)) || answerText.includes(memory.title));
}

/** Sources for the *current* assistant turn only, and only once its answer
 * text has actually started streaming in — not the moment the search tool
 * result lands. A tool call resolves well before the model's reply starts
 * generating, so surfacing sources at that point produced a "flash" of
 * cards during the thinking gap, followed by them reappearing once the
 * text showed up. Gating on the presence of text (not tool completion)
 * mirrors Perplexity's sidebar, which only populates once the answer
 * itself begins. */
export function getCurrentSources(messages: UIMessage[]): SearchMemoriesResult["memories"] | null {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return null;
  const hasAnswerText = last.parts.some((p) => p.type === "text" && p.text.trim().length > 0);
  if (!hasAnswerText) return null;
  const cited = collectCitedMemories(last.parts);
  return cited.length > 0 ? cited : null;
}

// The server reconstructs the same {text, dynamic-tool} part shape the live
// streaming path produces (see ai.service.ts's getThreadMessages) — this is
// a type-only pass-through, not a data conversion, so a resumed thread
// renders through the exact same SearchToolPart/MemoryAttachmentCards
// components a live one does instead of degrading to text-only.
export function toInitialMessages(history: ThreadMessage[]): UIMessage[] {
  return history as unknown as UIMessage[];
}

/** Today / Yesterday / Previous 7 days / Previous 30 days / Older, newest first. */
export function groupThreadsByDate<T extends { updatedAt: string }>(threads: T[]): { label: string; threads: T[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const labelFor = (updatedAt: string) => {
    const t = new Date(updatedAt).getTime();
    if (t >= startOfToday.getTime()) return "Today";
    if (t >= startOfToday.getTime() - day) return "Yesterday";
    if (t >= startOfToday.getTime() - 7 * day) return "Previous 7 days";
    if (t >= startOfToday.getTime() - 30 * day) return "Previous 30 days";
    return "Older";
  };
  const groups: { label: string; threads: T[] }[] = [];
  for (const thread of [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const label = labelFor(thread.updatedAt);
    const last = groups.at(-1);
    if (last?.label === label) last.threads.push(thread);
    else groups.push({ label, threads: [thread] });
  }
  return groups;
}
