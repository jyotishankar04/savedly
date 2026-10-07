import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../../../../config/env";
import { logger } from "../../../../shared/utils/logger";

// Answers "how do I…" questions about Savedly itself from the Help
// Center's own guides, served by the web app at /api/help
// (client/app/api/help/route.ts). Reading them live keeps one source of
// truth: a guide edited on the site is what the assistant says next.

interface HelpAction {
  label: string;
  href: string;
}

interface HelpGuide {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  steps: { title: string; body: string }[];
  actions: HelpAction[];
  href: string;
}

interface HelpTool {
  slug: string;
  title: string;
  summary: string;
  href: string;
}

const CACHE_MS = 10 * 60 * 1000;
let cache: { guides: HelpGuide[]; tools: HelpTool[]; at: number } | null = null;

async function loadHelp(): Promise<{ guides: HelpGuide[]; tools: HelpTool[] }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const res = await fetch(new URL("/api/help", env.FRONTEND_URL), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { guides?: HelpGuide[]; tools?: HelpTool[] };
    cache = { guides: body.guides ?? [], tools: body.tools ?? [], at: Date.now() };
    return cache;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "[platform-help] couldn't load the Help Center");
    if (cache) return cache; // a stale copy beats no answer
    throw err;
  }
}

const STOP = new Set(["how", "do", "i", "can", "to", "the", "a", "an", "my", "in", "on", "of", "and", "or", "is", "it", "what", "where", "does", "for", "with", "use", "using", "savedly", "app", "you", "me", "this", "that", "work", "works", "get", "there", "way", "memory", "memories", "are", "am", "be", "should"]);

// Everyday words people use for things the guides name differently.
const SYNONYMS: Record<string, string> = { delet: "trash", remov: "trash", bin: "trash", recover: "trash", restor: "trash", privat: "vault", secret: "vault", hid: "vault", hidden: "vault", lock: "vault", folder: "collection", bookmark: "import", key: "key", model: "model" };

/** Crude English stem so "save", "saving", "saved" and "memory", "memories" meet. */
function stem(word: string): string {
  let w = word;
  if (w.endsWith("ies") && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && w.length > 3) w = w.slice(0, -1);
  return w.endsWith("e") && w.length > 3 ? w.slice(0, -1) : w;
}

const tokens = (text: string): Set<string> =>
  new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem));

/** The question's words plus the guide vocabulary they stand for. */
function queryTokens(text: string): Set<string> {
  const out = tokens(text);
  for (const w of [...out]) if (SYNONYMS[w]) out.add(SYNONYMS[w]);
  return out;
}

/** Title matches weigh most, then the summary and intro, then step text. */
function score(guide: HelpGuide, query: Set<string>): number {
  const title = tokens(guide.title);
  const summary = tokens(`${guide.summary} ${guide.intro}`);
  const steps = tokens(guide.steps.map((s) => `${s.title} ${s.body}`).join(" "));
  let total = 0;
  for (const w of query) {
    if (title.has(w)) total += 5;
    if (summary.has(w)) total += 2;
    if (steps.has(w)) total += 1;
  }
  return total;
}

const inputSchema = z.object({
  question: z.string().min(1).describe("The user's question about how to use Savedly, in their own words."),
});

// Two outputs: the model gets the guide text and the *names* of the buttons
// the app will show, never the links themselves (given paths, it wrote made-up
// "https://your-app-link/..." URLs into its answer). The UI gets the links as
// the tool's artifact and renders them as buttons (client/components/ask/help-actions.tsx).
export const platformHelpTool = tool(
  async ({ question }: z.infer<typeof inputSchema>) => {
    const { guides, tools } = await loadHelp();
    const query = queryTokens(question);
    const ranked = guides
      .map((guide) => ({ guide, s: score(guide, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
    // A second guide only when it's nearly as relevant as the best one.
    const top = ranked.filter((r, i) => i === 0 || (i === 1 && r.s >= ranked[0].s * 0.6)).map((r) => r.guide);
    const relatedTools = tools.filter((t) => [...tokens(`${t.title} ${t.summary}`)].some((w) => query.has(w)));

    const buttons = [...top.flatMap((g) => g.actions.map((a) => a.label)), ...relatedTools.map((t) => t.title), ...top.map((g) => `Guide: ${g.title}`)];
    const forModel = {
      topics: top.map(({ title, summary, steps }) => ({ title, summary, steps })),
      relatedTools: relatedTools.map(({ title, summary }) => ({ title, summary })),
      buttonsShownToUser: buttons,
    };
    const forUi = {
      question,
      topics: top.map(({ slug, title, actions, href }) => ({ slug, title, actions, href })),
      tools: relatedTools.map(({ title, href }) => ({ title, href })),
    };
    return [JSON.stringify(forModel), forUi];
  },
  {
    name: "get_platform_help",
    description:
      "Look up how to use Savedly itself — saving memories, organizing, search, Ask, AI keys and models, sharing, the vault, calendar, importing, the browser extension, notifications, account settings, keyboard shortcuts. Returns the matching Help Center guides with their steps, and the names of the buttons the app shows under your answer. Use for questions about the app, not about the user's saved content.",
    schema: inputSchema,
    responseFormat: "content_and_artifact",
  },
);
