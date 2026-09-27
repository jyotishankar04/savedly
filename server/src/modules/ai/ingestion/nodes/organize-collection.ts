import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { collections } from "../../../../db/schema";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

interface CollectionDecision {
  action: "existing" | "new" | "none";
  collectionName?: string;
  icon?: string;
  description?: string;
}

const prompt = ChatPromptTemplate.fromTemplate(
  `You are organizing a personal knowledge base into collections (folders).
A new memory was just saved:
Title: {title}
Summary: {summary}
Category: {resourceCategory}

The user's existing collections:
{existingCollections}

Judge by the memory's subject matter (what it is about), not by its kind: the "Category" above says what type of content it is (a task, a note, a link), which says nothing about which topic collection it belongs in.

Decide how to organize this memory, in this order:
1. If one of the existing collections is genuinely related to this memory's topic, respond with action "existing" and its exact name (must match one of the names above exactly). Prefer this whenever the fit is real.
2. If none of the existing collections is related, do NOT force the memory into an unrelated one just because a collection exists (e.g. a beekeeping article does not belong in a generic "Tasks" or "Ideas" collection). Instead respond with action "new" and propose a short name (2-4 words), a single emoji as the icon, and a one-sentence description. Keep the name broad enough that future memories on the topic will fit (e.g. "Recipes", not "Sourdough starter tips").
3. Only if the memory is truly one-off or too generic to group under any topic (e.g. a passing reminder, a lone unrelated link), respond with action "none".

Respond as strict JSON: {{"action": "existing"|"new"|"none", "collectionName": "...", "icon": "...", "description": "..."}}`,
);

/** Uses an existing collection only when it is genuinely related; otherwise creates a new one. "none" is reserved for true one-offs. */
export async function organizeCollection(state: IngestionStateType): Promise<IngestionUpdate> {
  const model = await getChatModel(state.userId, "fast");
  if (!model) {
    logNode(state.memoryId, "organizeCollection", { skipped: "AI not configured" });
    return { collectionAction: "none", collectionName: null, collectionIcon: null, collectionDescription: null };
  }

  const existing = await db
    .select({ name: collections.name, description: collections.description })
    .from(collections)
    .where(eq(collections.userId, state.userId));

  const existingCollectionsText =
    existing.length > 0
      ? existing.map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`).join("\n")
      : "(none yet)";

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<CollectionDecision>());
  const decision = await chain.invoke(
    {
      title: state.aiTitle ?? state.existingTitle,
      summary: state.aiSummary ?? "",
      resourceCategory: state.resourceCategory ?? "",
      existingCollections: existingCollectionsText,
    },
    { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:organize_collection", memoryId: state.memoryId })] },
  );

  logNode(state.memoryId, "organizeCollection", decision as unknown as Record<string, unknown>);

  return {
    collectionAction: decision.action,
    collectionName: decision.collectionName ?? null,
    collectionIcon: decision.icon ?? null,
    collectionDescription: decision.description ?? null,
  };
}
