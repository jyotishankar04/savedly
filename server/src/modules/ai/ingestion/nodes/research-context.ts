import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PlanLimitType } from "../../../../db/enums";
import { isWithinLimit } from "../../../plans/api";
import { getChatModel } from "../../models";
import { createUsageCallback } from "../../../ai-usage/api";
import { UNTRUSTED_RULE, wrapUntrusted } from "../../untrusted";
import { formatResults, webSearch, webSearchAvailable } from "../../web-search/web-search";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

// A note this short is usually a name or a reminder; anything longer says enough about itself.
const MAX_NOTE_WORDS = 15;
// A link whose page gave less than this couldn't be read (blocked, sign-in wall, script-only).
const THIN_PAGE_CHARS = 150;

const decidePrompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

Someone saved this to their personal library:
{saved}

Do you know, for certain, what it refers to? Search the web only when it names something specific you can't pin down: a film, show, book, song, game, product, app, company, person, place or term, especially anything recent or obscure. A personal reminder or an everyday phrase ("buy milk", "call mom Friday", "ideas for the trip") never needs a search. If you only half-recognise a name, search: guessing gets it filed in the wrong place.

Respond as strict JSON: {{"search": true|false, "query": "the best web search to find out what it is, or empty"}}`,
);

const findingsPrompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

Someone saved this:
{saved}

Web search results for "{query}":
{results}

From these results only, say what the saved item is. Write one or two plain factual sentences (what it is, who made it, when, as the results say), and name the kind of thing in one or two words ("film", "novel", "web app", "restaurant", "person"). If the results are about something else, or disagree, return empty strings rather than guess.

Respond as strict JSON: {{"findings": "...", "kind": "...", "sources": [result numbers you used, like 1, 3]}}`,
);

interface Decision {
  search?: boolean;
  query?: string;
}
interface Findings {
  findings?: string;
  kind?: string;
  sources?: number[];
}

const NONE: IngestionUpdate = { webResearch: null };

/** The research findings as a line for later prompts, fenced as outside text since it came from web pages. */
export function researchForPrompt(state: IngestionStateType): string {
  const research = state.webResearch;
  if (!research) return "(not looked up)";
  return wrapUntrusted(`${research.findings}${research.kind ? ` Kind: ${research.kind}.` : ""}`, "web lookup");
}

/**
 * What to judge from: a short note's text, or a link that couldn't be read (its address, title and
 * caption).
 */
function whatWasSaved(state: IngestionStateType): string | null {
  if (state.mediaType === "note") {
    const text = state.rawContent.trim();
    // A note with a link in it is about that link, which gets read on its own.
    if (!text || /https?:\/\/\S/i.test(text)) return null;
    return text.split(/\s+/).length <= MAX_NOTE_WORDS ? text : null;
  }
  if ((state.mediaType === "web" || state.mediaType === "video") && state.rawContent.trim().length < THIN_PAGE_CHARS && state.url) {
    return [state.previewTitle, state.url, state.caption].filter(Boolean).join(" | ");
  }
  return null;
}

/**
 * Looks something up on the web when the AI can't tell what a save is (a bare "hanuman ansh" is a
 * film), so the summary, tags and collection are about the real thing. Skipped for anything
 * self-explanatory, without web search, or when the month's lookups are used up.
 */
export async function researchContext(state: IngestionStateType): Promise<IngestionUpdate> {
  const saved = whatWasSaved(state);
  if (!saved) return NONE;
  if (!(await webSearchAvailable())) {
    logNode(state.memoryId, "researchContext", { skipped: "web search not set up" });
    return NONE;
  }
  if (!(await isWithinLimit(state.userId, PlanLimitType.WEB_SEARCH_MONTHLY, 1))) {
    logNode(state.memoryId, "researchContext", { skipped: "monthly lookups used up" });
    return NONE;
  }

  const model = await getChatModel(state.userId, "fast", { kind: "save", memoryId: state.memoryId });
  if (!model) return NONE;
  const usage = (requestType: string) => ({ callbacks: [createUsageCallback({ userId: state.userId, requestType, memoryId: state.memoryId })] });

  const decision = await decidePrompt
    .pipe(model)
    .pipe(new JsonOutputParser<Decision>())
    .invoke({ saved: wrapUntrusted(saved, "saved item") }, usage("ingestion:research_decide"));
  const query = decision.search ? decision.query?.trim().slice(0, 200) : "";
  if (!query) {
    logNode(state.memoryId, "researchContext", { searched: false });
    return NONE;
  }

  const outcome = await webSearch(state.userId, query, { requestType: "ingestion:research", memoryId: state.memoryId });
  if (!outcome.ok || outcome.results.length === 0) {
    logNode(state.memoryId, "researchContext", { query, searched: true, found: outcome.ok ? 0 : outcome.reason });
    return NONE;
  }

  const found = await findingsPrompt
    .pipe(model)
    .pipe(new JsonOutputParser<Findings>())
    .invoke({ saved: wrapUntrusted(saved, "saved item"), query, results: wrapUntrusted(formatResults(outcome.results), "web search results") }, usage("ingestion:research_findings"));
  const findings = found.findings?.trim();
  if (!findings) {
    logNode(state.memoryId, "researchContext", { query, searched: true, usable: false });
    return NONE;
  }

  const picked = (found.sources ?? []).map((n) => outcome.results[n - 1]).filter((r) => r !== undefined);
  const sources = (picked.length ? picked : outcome.results.slice(0, 2)).slice(0, 3).map((r) => ({ title: r.title.slice(0, 200), url: r.url }));
  const kind = found.kind?.trim();
  logNode(state.memoryId, "researchContext", { query, findings, kind, sources: sources.length });
  return { webResearch: { query, findings, kind: kind || null, sources, at: new Date().toISOString() } };
}
