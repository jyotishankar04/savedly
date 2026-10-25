import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../db";
import { collectionMemories, collections } from "../../../../db/schema";
import { getChatModel } from "../../models";
import { createUsageCallback } from "../../../ai-usage/api";
import { logNode } from "../log";
import { collectionNameKey } from "../../../collection/api";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { UNTRUSTED_RULE, wrapUntrusted } from "../../untrusted";
import { researchForPrompt } from "./research-context";

interface CollectionDecision {
  action: "existing" | "new" | "none";
  collectionName?: string;
  icon?: string;
  description?: string;
}

const prompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

You are organizing a personal knowledge base into collections (folders).
A new memory was just saved:
Title: {title}
Summary: {summary}
Tags: {tags}
Category: {resourceCategory}
What a web search found it to be: {research}

The user's existing collections:
{existingCollections}

File it by WHAT IT IS ABOUT, never by its format. The "Category" says what kind of item it is (a task, an event, a note, a link); that says nothing about which topic collection it belongs in.

Having a date or a time does NOT make something a meeting or a scheduling item. Only work or appointment-style meetings belong in a meetings/scheduling collection. Examples of the right call:
- "Mom's birthday, Oct 3" → a "Birthdays" collection, never "Meetings" or "Scheduling"
- "Our wedding anniversary" → an "Anniversaries" collection
- "Flight to Bengaluru on Friday" → "Travel"
- "Dentist appointment at 4:30" → "Health"
- "File taxes by the 15th" → "Taxes" or "Finances"
- "Sprint planning with the team" → "Meetings" (this one really is a meeting)
- "Hanuman Ansh" (a film) → "Movies"; "Project Hail Mary" (a novel) → "Books"; "Linear" (a web app) → "Tools" or "Apps"

Never name a collection after the memory itself: not its title, and not the specific film, book, person, product or place it is about. A collection holds many memories of a kind or on a subject, so name the kind or the subject.

Decide, in this order:
1. If an existing collection is about the same subject, so the user would look for this memory there, respond with action "existing" and its exact name: only the words inside the quotes, never the "about" part. A collection that only shares the format (both have dates, both are notes, both are tasks) is NOT a fit.
2. If none is about the same subject, do NOT force it into an unrelated one. Respond with action "new" and propose a short name (1-3 words, plural where natural, like "Birthdays" or "Recipes"), a single emoji as the icon, and a one-sentence description. Keep it broad enough that future memories on the subject fit, but specific to the subject: "Birthdays", not "Events" or "Personal".
3. Only if the memory is truly too generic to belong to any subject (a lone "remember this", a stray test note), respond with action "none".

Respond as strict JSON: {{"action": "existing"|"new"|"none", "collectionName": "...", "icon": "...", "description": "..."}}`,
);

const NONE: IngestionUpdate = { collectionAction: "none", collectionName: null, collectionIcon: null, collectionDescription: null };

/** Files the memory into the collection about the same subject, creating one when none fits. "none" is reserved for true one-offs. */
export async function organizeCollection(state: IngestionStateType): Promise<IngestionUpdate> {
  // Someone already put it in a collection (by hand, or through Ask): that choice stands, and a re-ingest must not add a second one.
  const [alreadyFiled] = await db
    .select({ collectionId: collectionMemories.collectionId })
    .from(collectionMemories)
    .where(eq(collectionMemories.memoryId, state.memoryId))
    .limit(1);
  if (alreadyFiled) {
    logNode(state.memoryId, "organizeCollection", { skipped: "already in a collection" });
    return NONE;
  }

  const model = await getChatModel(state.userId, "fast", { kind: "save", memoryId: state.memoryId });
  if (!model) {
    logNode(state.memoryId, "organizeCollection", { skipped: "AI not configured" });
    return NONE;
  }

  // Vaulted collections are hidden behind the PIN; filing an ordinary memory there would hide it too.
  const existing = await db
    .select({ name: collections.name, description: collections.description })
    .from(collections)
    .where(and(eq(collections.userId, state.userId), eq(collections.isVaulted, false)));

  const existingCollectionsText =
    existing.length > 0 ? existing.map((c) => `- "${c.name}"${c.description ? ` (about: ${c.description})` : ""}`).join("\n") : "(none yet)";

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<CollectionDecision>());
  const decision = await chain.invoke(
    {
      title: wrapUntrusted(state.aiTitle ?? state.existingTitle, "title"),
      summary: wrapUntrusted(state.aiSummary ?? "", "summary"),
      tags: state.suggestedTags.join(", ") || "(none)",
      resourceCategory: state.resourceCategory ?? "",
      research: researchForPrompt(state),
      existingCollections: existingCollectionsText,
    },
    { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:organize_collection", memoryId: state.memoryId })] },
  );

  const name = decision.collectionName?.trim();
  if (decision.action === "none" || !name) {
    logNode(state.memoryId, "organizeCollection", { ...decision, resolved: "none" } as Record<string, unknown>);
    return NONE;
  }

  // The model's answer is only a name: match it to a real collection either
  // way, so "new: Birthday" reuses an existing "Birthdays", and an "existing"
  // name it misspelled still lands somewhere instead of nowhere.
  // A model that copied the whole listed line ("Movies (about: films I liked)", or "Movies: films…") still means "Movies".
  const bare = [name, name.replace(/\s*\(about:.*$/i, ""), name.split(/\s*[:—–]\s+/)[0]!].map((n) => n.replace(/^["']|["']$/g, "").trim());
  const match = existing.find((c) => bare.some((n) => collectionNameKey(c.name) === collectionNameKey(n)));
  const resolved: IngestionUpdate = match
    ? { collectionAction: "existing", collectionName: match.name, collectionIcon: null, collectionDescription: null }
    : { collectionAction: "new", collectionName: name.slice(0, 60), collectionIcon: decision.icon ?? null, collectionDescription: decision.description ?? null };

  logNode(state.memoryId, "organizeCollection", { ...decision, resolved: resolved.collectionAction, resolvedName: resolved.collectionName } as Record<string, unknown>);
  return resolved;
}
