import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections } from "../../db/schema";
import { getChatModel, UNTRUSTED_RULE, wrapUntrusted } from "../ai/api";
import { collectionNameKey } from "../collection/api";
import { createUsageCallback } from "../ai-usage/api";

export interface PageSuggestion {
  collection: { id: string | null; name: string; isNew: boolean } | null;
  tags: string[];
}

const prompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

Someone is about to save this page to their personal library:
{page}

Their collections:
{existing}

Suggest where it goes and how to tag it.
- Collection: the existing one about the same subject, using only its name; otherwise a short new name (1-3 words, plural where natural, like "Recipes"). Never name a collection after the page itself or the specific thing it's about: a film goes in "Movies", a novel in "Books". If it's too generic for any subject, use null.
- Tags: 2 to 5 short lowercase tags about its subject (not its format, not "link" or "article").

Respond as strict JSON: {{"collection": "name" or null, "tags": ["…"]}}`,
);

// Opening the popup on the same page twice shouldn't ask twice.
const cache = new Map<string, { at: number; value: PageSuggestion }>();
const CACHE_MS = 10 * 60 * 1000;

/**
 * Before a save from the extension: which collection and tags fit this page.
 * Shown as chips to tap, never applied by itself. Empty when the user has no
 * AI available (no key, or included AI used up); it never blocks a save.
 */
export async function suggestForPage(userId: string, input: { url: string; title?: string; description?: string }): Promise<PageSuggestion> {
  const key = `${userId}:${input.url}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const model = await getChatModel(userId, "fast", { kind: "save", memoryId: null });
  if (!model) return { collection: null, tags: [] };

  const existing = await db
    .select({ id: collections.id, name: collections.name, description: collections.description })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.isVaulted, false)));

  const answer = await prompt
    .pipe(model)
    .pipe(new JsonOutputParser<{ collection?: string | null; tags?: unknown }>())
    .invoke(
      {
        page: wrapUntrusted([input.title, input.url, input.description].filter(Boolean).join("\n").slice(0, 1500), "page"),
        existing: existing.length ? existing.map((c) => `- "${c.name}"${c.description ? ` (about: ${c.description})` : ""}`).join("\n") : "(none yet)",
      },
      { callbacks: [createUsageCallback({ userId, requestType: "extension:suggest" })] },
    );

  const name = typeof answer.collection === "string" ? answer.collection.replace(/\s*\(about:.*$/i, "").replace(/^["']|["']$/g, "").trim().slice(0, 60) : "";
  const match = name ? existing.find((c) => collectionNameKey(c.name) === collectionNameKey(name)) : undefined;
  const tags = Array.isArray(answer.tags)
    ? [...new Set(answer.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase().slice(0, 50)).filter(Boolean))].slice(0, 5)
    : [];
  const value: PageSuggestion = {
    collection: name ? (match ? { id: match.id, name: match.name, isNew: false } : { id: null, name, isNew: true }) : null,
    tags,
  };
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}
