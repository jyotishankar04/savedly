import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { extractUrl } from "../extract-url";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

interface ContentTypeExtraction {
  contentType: string;
  extractedFields: Record<string, string>;
}

// Deliberately open-vocabulary — unlike ClassifyIntent's fixed per-media
// taxonomy, this node isn't handed a category list. It runs first so a raw
// blob of user-entered text ("a recipe", "a task", "a quote", a link with a
// comment attached, ...) gets identified and picked apart into structured
// fields before anything downstream tries to summarize or classify it.
const prompt = ChatPromptTemplate.fromTemplate(
  `A user just saved this text to their personal knowledge base. Identify what
KIND of content it is — pick a short, specific, snake_case label of your own
choosing (e.g. "recipe", "code_snippet", "task", "quote", "contact_info",
"shopping_list", "meeting_notes", "idea", "article_excerpt", "link_with_comment",
"other" — these are just examples, use whatever label best fits).

Then extract whatever structured fields are actually relevant to that content
type as a flat JSON object of short field names to string values. Examples:
a recipe might yield {{"ingredients": "...", "servings": "..."}}, a task might
yield {{"dueDate": "...", "priority": "..."}}, a quote might yield
{{"author": "...", "source": "..."}}. Only include fields that are clearly
present or inferable — omit anything you're not confident about. If nothing
meaningful can be extracted, return an empty object.

Content:
{content}

Respond as strict JSON: {{"contentType": "...", "extractedFields": {{...}}}}`,
);

export async function detectContentType(state: IngestionStateType): Promise<IngestionUpdate> {
  // Deterministic regex pass first — a backstop for the client's own
  // detection, independent of whatever the LLM decides below. Only relevant
  // when the memory wasn't already saved with a url (i.e. it came in as a
  // note/video but might actually contain a link the client missed).
  // Only for text the user typed (notes). For images, documents and voice,
  // rawContent is OCR or a transcript: a URL that merely appears on screen
  // (and is often misread) must never turn the memory into a link.
  const detectedUrl = state.mediaType === "note" && !state.url ? extractUrl(state.rawContent) : null;

  if (!state.rawContent) {
    logNode(state.memoryId, "detectContentType", { skipped: "no content" });
    return { contentType: null, extractedFields: {}, detectedUrl: detectedUrl?.href ?? null };
  }

  const model = await getChatModel(state.userId, "fast");
  if (!model) {
    logNode(state.memoryId, "detectContentType", { skipped: "AI not configured" });
    return { contentType: null, extractedFields: {}, detectedUrl: detectedUrl?.href ?? null };
  }

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<ContentTypeExtraction>());
  const result = await chain.invoke(
    { content: state.rawContent.slice(0, 4000) },
    { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:detect_content_type", memoryId: state.memoryId })] },
  );

  logNode(state.memoryId, "detectContentType", {
    contentType: result.contentType,
    extractedFields: result.extractedFields,
    detectedUrl: detectedUrl?.href ?? null,
  });

  return {
    contentType: result.contentType ?? null,
    extractedFields: result.extractedFields ?? {},
    detectedUrl: detectedUrl?.href ?? null,
  };
}
