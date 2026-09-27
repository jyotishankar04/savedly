import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";

interface Insights {
  title: string;
  summary: string;
  suggestedTags: string[];
}

// Adapted from docs/AI_REQUIREMENTS.md's GenerateAIInsights node — extended
// with DetectContentType's output so a recipe's title reflects its
// ingredients, a task's summary reflects its due date, etc.
//
// `context` (title/domain/URL/caption) exists specifically for the empty-
// content case: without it, a fetch failure (blocked scraper, JS-only page)
// left the model nothing to work with but "no content available," and it
// would write a summary *about the absence of content* ("this page appears
// to be a placeholder with no content") instead of inferring anything real.
// That sentence then becomes this memory's `description` AND gets embedded
// for search — a handful of near-identical "no content" summaries across
// different memories cluster in embedding space and can outrank genuinely
// relevant results. The instruction below is the actual fix; `context` just
// gives the model something better to reach for.
const prompt = ChatPromptTemplate.fromTemplate(
  `Analyze the following captured memory and generate a structured JSON object.

Content:
{content}

Context (title / domain / URL / caption — use this to ground your answer, especially if the content above is empty or minimal):
{context}

Inferred intent: {inferredIntent} (category: {resourceCategory})
Content type: {contentType}
Extracted fields: {extractedFields}

Respond with valid JSON matching this schema:
{{
  "title": "Clear concise title (max 8 words)",
  "summary": "2-3 sentence overview highlighting core concepts and significance. If there's no real content to summarize, infer what this is likely about from the context instead — never describe the absence of content itself (do not write things like 'this page has no content' or 'this is a placeholder').",
  "suggestedTags": ["Tag1", "Tag2", "Tag3"]
}}`,
);

export async function generateAiInsights(state: IngestionStateType): Promise<IngestionUpdate> {
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
    logNode(state.memoryId, "generateAiInsights", { skipped: "AI not configured" });
    return { aiTitle: null, aiSummary: null, suggestedTags: [] };
  }

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<Insights>());
  const insights = await chain.invoke(
    {
      content: (state.rawContent || "(none captured)").slice(0, 4000),
      context,
      inferredIntent: state.inferredIntent ?? "",
      resourceCategory: state.resourceCategory ?? "",
      contentType: state.contentType ?? "",
      extractedFields: Object.keys(state.extractedFields).length > 0 ? JSON.stringify(state.extractedFields) : "",
    },
    { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:generate_insights", memoryId: state.memoryId })] },
  );

  logNode(state.memoryId, "generateAiInsights", {
    title: insights.title,
    summary: insights.summary,
    suggestedTags: insights.suggestedTags,
  });

  return {
    aiTitle: insights.title,
    aiSummary: insights.summary,
    suggestedTags: insights.suggestedTags,
  };
}
