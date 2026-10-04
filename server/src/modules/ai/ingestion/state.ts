import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

const chunkSchema = z.object({
  index: z.number(),
  content: z.string(),
  tokenCount: z.number().optional(),
});

// Mirrors BrowserCapturePayload (url-processor/types.ts) — kept as its own
// zod shape here since StateSchema fields need one.
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

  // Inputs the ingestion pipeline works from — whatever's already on the
  // memory row at creation time (url for web/video, content for note,
  // the first attachment's fileUrl/mimeType for image/document).
  url: z.string().nullable().default(null),
  attachmentUrl: z.string().nullable().default(null),
  attachmentMimeType: z.string().nullable().default(null),
  // Never overwritten — used by UpsertVectors to decide whether the
  // AI-generated title should fill in for the schema's "Untitled" default
  // rather than clobber a title the user actually typed.
  existingTitle: z.string().default("Untitled"),
  // The memory's own `content` at creation time. For a "note" this IS the
  // primary body (never touched by CorrectCaption). For every other type
  // it's a short caption typed alongside a link/attachment ("ui inspo for
  // my saas" next to an Instagram link) — CorrectCaption fixes spelling on
  // this without changing rawContent, which stays whatever ParseWebContent/
  // ExtractDocText/etc. actually fetched.
  caption: z.string().default(""),

  // Populated by the per-media-type node (ParseWebContent/NormalizeNote/etc).
  rawContent: z.string().default(""),

  // ParseWebContent-only (docs/URL_CAPTURE_AND_PREVIEW.md). Raw browser
  // capture from the extension (POST /:id/browser-capture), seeded by the
  // worker from memories.browser_capture — null if none was ever submitted.
  browserCapture: browserCaptureSchema.nullable().default(null),
  platform: z.string().nullable().default(null),
  resourceType: z.string().nullable().default(null),
  fetchStatus: z.string().nullable().default(null),
  canonicalUrl: z.string().nullable().default(null),
  // Final, merged values (server metadata + browser capture, priority-
  // resolved by buildPreview) — what actually gets written to the memory row.
  previewImageUrl: z.string().nullable().default(null),
  faviconUrl: z.string().nullable().default(null),
  previewStatus: z.string().nullable().default(null),
  previewSource: z.string().nullable().default(null),
  sourceDomain: z.string().nullable().default(null),
  // og:title/og:description (or browser-captured equivalents) — a fallback
  // tier for UpsertVectors below the AI-generated title/summary, so a real
  // page title still wins over "Untitled" even if AI enrichment itself fails.
  previewTitle: z.string().nullable().default(null),
  previewDescription: z.string().nullable().default(null),

  // CorrectCaption output — null when skipped (note body, or no caption).
  correctedCaption: z.string().nullable().default(null),

  // DetectContentType output — open-vocabulary (not a fixed enum, unlike
  // resourceCategory below) plus whatever structured fields make sense for
  // that specific type (a recipe's ingredients, a task's due date, ...).
  contentType: z.string().nullable().default(null),
  extractedFields: z.record(z.string(), z.string()).default({}),
  // Deterministic (regex, not LLM) re-check for an embedded URL — a
  // backstop for the client's own detection, so a "note" that actually
  // contains a link still ends up correctly typed and gets its url column
  // populated, whether or not the client caught it first.
  detectedUrl: z.string().nullable().default(null),

  // ClassifyIntent output.
  resourceCategory: z.string().nullable().default(null),
  inferredIntent: z.string().nullable().default(null),
  intentConfidence: z.number().nullable().default(null),

  // DetectEvent output — a best-guess absolute date/time this memory is
  // "about," if any (ISO 8601), and its confidence. Null/null when no
  // event was detected, or when the node degraded after an LLM/parse
  // failure — see nodes/detect-event.ts, which deliberately never throws.
  detectedEventAt: z.string().nullable().default(null),
  eventDetectionConfidence: z.number().nullable().default(null),

  // GenerateAIInsights output.
  aiTitle: z.string().nullable().default(null),
  aiSummary: z.string().nullable().default(null),
  suggestedTags: z.array(z.string()).default([]),

  // OrganizeCollection output — the decision only; UpsertVectors is where
  // the actual collection row gets created/linked, alongside every other
  // write this pipeline makes.
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
