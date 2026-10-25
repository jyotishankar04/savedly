import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import type { SocialPost } from "../url-processor";

const chunkSchema = z.object({
  index: z.number(),
  content: z.string(),
  tokenCount: z.number().optional(),
});

// Mirrors BrowserCapturePayload (url-processor/types.ts); StateSchema fields need their own zod shape.
const browserCaptureSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  canonicalUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  platform: z.string().optional(),
  resourceType: z.string().optional(),
  selectedText: z.string().optional(),
  capturedAt: z.string().optional(),
});

export const IngestionState = new StateSchema({
  memoryId: z.string(),
  userId: z.string(),
  mediaType: z.enum(["web", "video", "note", "image", "document", "voice"]),

  // Inputs from the memory row at creation: url (web/video), content (note), first attachment's
  // fileUrl/mimeType (image/document).
  url: z.string().nullable().default(null),
  attachmentUrl: z.string().nullable().default(null),
  attachmentMimeType: z.string().nullable().default(null),
  // Never overwritten; UpsertVectors uses it to tell a default "Untitled" from a title the user typed.
  existingTitle: z.string().default("Untitled"),
  // The memory's own `content` at creation: a note's body (never changed by CorrectCaption), else a
  // short caption CorrectCaption spell-fixes without touching rawContent.
  caption: z.string().default(""),

  // Populated by the per-media-type node (ParseWebContent/NormalizeNote/etc).
  rawContent: z.string().default(""),

  // ParseWebContent only: raw capture from the extension, seeded from memories.browser_capture;
  // null if never submitted.
  browserCapture: browserCaptureSchema.nullable().default(null),
  platform: z.string().nullable().default(null),
  resourceType: z.string().nullable().default(null),
  fetchStatus: z.string().nullable().default(null),
  canonicalUrl: z.string().nullable().default(null),
  // Final merged values (server metadata + browser capture, via buildPreview), written to the memory row.
  previewImageUrl: z.string().nullable().default(null),
  faviconUrl: z.string().nullable().default(null),
  previewStatus: z.string().nullable().default(null),
  previewSource: z.string().nullable().default(null),
  sourceDomain: z.string().nullable().default(null),
  // og:title/description (or browser equivalents): a fallback below the AI title/summary, so a real
  // page title beats "Untitled" if AI fails.
  previewTitle: z.string().nullable().default(null),
  previewDescription: z.string().nullable().default(null),
  // A social post or video, read from its platform by ParseWebContent (url-processor/social).
  socialPost: z.custom<SocialPost>().nullable().default(null),

  // CorrectCaption output — null when skipped (note body, or no caption).
  correctedCaption: z.string().nullable().default(null),

  // DetectContentType output: open-vocabulary (unlike resourceCategory) plus fields for that type
  // (a recipe's ingredients, a task's due date).
  contentType: z.string().nullable().default(null),
  extractedFields: z.record(z.string(), z.string()).default({}),
  // Regex re-check for an embedded URL, so a note containing a link still gets typed and its url set.
  detectedUrl: z.string().nullable().default(null),

  // ClassifyIntent output.
  resourceCategory: z.string().nullable().default(null),
  inferredIntent: z.string().nullable().default(null),
  intentConfidence: z.number().nullable().default(null),

  // DetectEvent output: a best-guess ISO date/time and confidence; null/null when none or the node degraded.
  detectedEventAt: z.string().nullable().default(null),
  eventDetectionConfidence: z.number().nullable().default(null),

  // ResearchContext output: what a web search said a short or unreadable save is, for later steps;
  // null when it didn't search.
  webResearch: z
    .object({
      query: z.string(),
      findings: z.string(),
      kind: z.string().nullable(),
      sources: z.array(z.object({ title: z.string(), url: z.string() })),
      at: z.string(),
    })
    .nullable()
    .default(null),

  // GenerateAIInsights output.
  aiTitle: z.string().nullable().default(null),
  aiSummary: z.string().nullable().default(null),
  suggestedTags: z.array(z.string()).default([]),

  // OrganizeCollection's decision only; UpsertVectors creates or links the collection row.
  collectionAction: z.enum(["existing", "new", "none"]).default("none"),
  collectionName: z.string().nullable().default(null),
  collectionIcon: z.string().nullable().default(null),
  collectionDescription: z.string().nullable().default(null),

  // SemanticChunker / GenerateEmbeddings output.
  chunks: z.array(chunkSchema).default([]),
  documentEmbedding: z.array(z.number()).default([]),
  chunkEmbeddings: z.array(z.array(z.number())).default([]),

  // UpsertVectors output — the final memories.status this run resolved to.
  finalStatus: z.string().nullable().default(null),
});

export type IngestionStateType = typeof IngestionState.State;
export type IngestionUpdate = typeof IngestionState.Update;
