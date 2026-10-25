import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../models";
import { createUsageCallback } from "../../../ai-usage/api";
import { linkOfNote } from "../extract-url";
import { logNode } from "../log";
import { researchForPrompt } from "./research-context";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { UNTRUSTED_RULE, wrapUntrusted } from "../../untrusted";

interface ContentTypeExtraction {
  contentType: string;
  extractedFields: Record<string, string>;
}

// Deliberately open-vocabulary (no category list). Runs first so raw text ("a recipe", a link with
// a comment) is identified and split into fields before later steps.
const prompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

A user just saved this text to their personal knowledge base. Identify what
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

What a web search found it to be (when the text alone is just a name; trust this over your own guess):
{research}

Respond as strict JSON: {{"contentType": "...", "extractedFields": {{...}}}}`,
);

export async function detectContentType(state: IngestionStateType): Promise<IngestionUpdate> {
  // Regex backstop for the client's detection, only for text the user typed (notes) and only when
  // the note is that link (see linkOfNote). For images, documents and voice, rawContent is OCR or a
  // transcript, and a URL seen there must never turn the memory into a link.
  const detectedUrl = state.mediaType === "note" && !state.url ? linkOfNote(state.rawContent) : null;

  if (!state.rawContent) {
    logNode(state.memoryId, "detectContentType", { skipped: "no content" });
    return { contentType: null, extractedFields: {}, detectedUrl: detectedUrl?.href ?? null };
  }

  const model = await getChatModel(state.userId, "fast", { kind: "save", memoryId: state.memoryId });
  if (!model) {
    logNode(state.memoryId, "detectContentType", { skipped: "AI not configured" });
    return { contentType: null, extractedFields: {}, detectedUrl: detectedUrl?.href ?? null };
  }

  const chain = prompt.pipe(model).pipe(new JsonOutputParser<ContentTypeExtraction>());
  const result = await chain.invoke(
    { content: wrapUntrusted(state.rawContent.slice(0, 4000), "saved content"), research: researchForPrompt(state) },
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
