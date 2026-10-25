import { PlanLimitType } from "../../../db/enums";
import { logger } from "../../../shared/utils/logger";
import { logAiUsage } from "../../ai-usage/usage-logger";
import { getSection, type ResolvedSection } from "../../../platform/instance-settings/instance-settings.service";
import { isWithinLimit } from "../../plans/plans.service";

/**
 * Web search for the AI: the research step on saves (ingestion's
 * researchContext) and Ask's search_web tool. The service is set in
 * instance settings (Admin -> Infrastructure -> Web search): Tavily, or a
 * SearXNG server of your own. Every lookup is logged as one "web:search"
 * usage row, which is what the plan's monthly WEB_SEARCH_MONTHLY allowance
 * counts (never limited on a self-hosted install).
 */

export interface WebResult {
  title: string;
  url: string;
  /** A few sentences from the page. */
  snippet: string;
}

export type WebSearchOutcome =
  | { ok: true; results: WebResult[] }
  | { ok: false; reason: "off" | "limit" | "failed"; message: string };

const MAX_RESULTS = 5;
const TIMEOUT_MS = 10_000;

const clip = (text: string, max = 500) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

async function tavily(apiKey: string, query: string): Promise<WebResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    // Basic depth is 1 credit; advanced is 2 and not needed to tell what something is.
    body: JSON.stringify({ query, search_depth: "basic", max_results: MAX_RESULTS, include_answer: false }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Tavily answered ${res.status}${res.status === 401 ? " (check the API key)" : ""}`);
  const body = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (body.results ?? []).filter((r) => r.url).map((r) => ({ title: r.title ?? r.url!, url: r.url!, snippet: clip(r.content ?? "") }));
}

async function searxng(baseUrl: string, query: string): Promise<WebResult[]> {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  // SearXNG answers 403 to format=json unless "json" is listed under search.formats in its settings.yml.
  if (!res.ok) throw new Error(`SearXNG answered ${res.status}${res.status === 403 ? " (switch on JSON output in its settings.yml)" : ""}`);
  const body = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (body.results ?? [])
    .filter((r) => r.url)
    .slice(0, MAX_RESULTS)
    .map((r) => ({ title: r.title ?? r.url!, url: r.url!, snippet: clip(r.content ?? "") }));
}

/** Runs one search with these settings. Used directly by Admin's Test connection; everything else goes through webSearch. */
export async function searchWith(settings: ResolvedSection, query: string): Promise<WebResult[]> {
  switch (settings.provider) {
    case "tavily":
      if (!settings.apiKey) throw new Error("Add a Tavily API key first.");
      return tavily(String(settings.apiKey), query);
    case "searxng":
      if (!settings.baseUrl) throw new Error("Add the SearXNG URL first.");
      return searxng(String(settings.baseUrl), query);
    default:
      throw new Error("Web search is off.");
  }
}

/** Whether web search is set up on this install, before spending a model call on deciding what to look up. */
export async function webSearchAvailable(): Promise<boolean> {
  const settings = await getSection("webSearch");
  return (settings.provider === "tavily" && !!settings.apiKey) || (settings.provider === "searxng" && !!settings.baseUrl);
}

/**
 * Searches the web for a user, within their plan's monthly lookups. Never
 * throws: off, over the limit and a failed request each come back as a
 * reason, because a lookup only ever adds to an answer.
 */
export async function webSearch(
  userId: string,
  query: string,
  context: { requestType: string; memoryId?: string | null; threadId?: string | null },
): Promise<WebSearchOutcome> {
  const settings = await getSection("webSearch");
  if (!(await webSearchAvailable())) return { ok: false, reason: "off", message: "Web search isn't set up on this server." };
  if (!(await isWithinLimit(userId, PlanLimitType.WEB_SEARCH_MONTHLY, 1))) {
    return { ok: false, reason: "limit", message: "This month's web lookups are used up. They come back next month, or upgrade for more." };
  }
  try {
    const results = await searchWith(settings, query);
    await logAiUsage({
      userId,
      requestType: "web:search",
      provider: String(settings.provider),
      model: "search",
      memoryId: context.memoryId ?? null,
      threadId: context.threadId ?? null,
      metadata: { source: "platform", for: context.requestType, query, results: results.length },
    });
    return { ok: true, results };
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId, for: context.requestType }, "[web-search] the search failed");
    return { ok: false, reason: "failed", message: "The web search didn't work just now." };
  }
}

/** Results as text for a prompt: numbered, so an answer can point at its sources. */
export function formatResults(results: WebResult[]): string {
  return results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n");
}
