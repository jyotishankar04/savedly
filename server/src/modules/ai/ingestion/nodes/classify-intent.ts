import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";

// Verbatim from docs/AI_REQUIREMENTS.md's ClassifyIntent node.
const TAXONOMY_BY_TYPE: Record<string, string[]> = {
  web: ["article", "documentation", "tool_or_saas", "social_post", "video_page", "pricing_page", "product_listing", "forum_or_qa", "other"],
  image: ["ui_design_inspiration", "code_snippet_reference", "receipt_or_document", "shopping_wishlist_item", "error_message_to_debug", "recipe", "meme_or_entertainment", "screenshot_of_conversation", "other"],
  note: ["idea_or_brainstorm", "task_or_reminder", "quote_or_excerpt", "journal_entry", "draft_in_progress", "reference_note"],
  voice: ["idea_or_brainstorm", "task_or_reminder", "quote_or_excerpt", "journal_entry", "reference_note"],
  video: ["tutorial", "entertainment", "lecture_or_talk", "product_review", "other"],
  document: ["reference_manual", "contract_or_legal", "research_paper", "personal_record", "other"],
};

interface IntentClassification {
  resourceCategory: string;
  inferredIntent: string;
  confidence: number;
}

const prompt = ChatPromptTemplate.fromTemplate(
  `Classify the following captured content. Choose the single best category from: {categories}.
Then explain in one sentence why the user most likely saved this — infer from the context (title/domain/URL/caption) if the content is empty or minimal. Never describe the absence of content itself (do not write things like "no content is available" or "this appears to be a placeholder").
Content:
{content}

Context (title / domain / URL / caption):
{context}

Respond as strict JSON: {{"resourceCategory": "...", "inferredIntent": "...", "confidence": 0.0}}`,
);

export async function classifyIntent(state: IngestionStateType): Promise<IngestionUpdate> {
  const context =
    [
      !isPlaceholderTitle(state.existingTitle) ? state.existingTitle : null,
      state.sourceDomain,
      state.url,
      state.platform,
      state.correctedCaption ?? (state.caption || null),
    ]
      .filter(Boolean)
      .join(" | ") || "(none available)";

  const model = await getChatModel(state.userId, "fast");
  if (!model) {
    logNode(state.memoryId, "classifyIntent", { skipped: "AI not configured" });
    return { resourceCategory: null, inferredIntent: null, intentConfidence: null };
  }

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<IntentClassification>());
  const result = await chain.invoke(
    {
      categories: (TAXONOMY_BY_TYPE[state.mediaType] ?? ["other"]).join(", "),
      content: (state.rawContent || "(none captured)").slice(0, 4000),
      context,
    },
    { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:classify_intent", memoryId: state.memoryId })] },
  );

  logNode(state.memoryId, "classifyIntent", {
    resourceCategory: result.resourceCategory,
    inferredIntent: result.inferredIntent,
    confidence: result.confidence,
  });

  return {
    resourceCategory: result.resourceCategory,
    inferredIntent: result.inferredIntent,
    intentConfidence: result.confidence,
  };
}
