import { StateGraph, START, END } from "@langchain/langgraph";
import { IngestionState } from "./state";
import type { ZodType } from "zod";
import { routeMediaType } from "./nodes/route-media-type";
import { parseWebContent } from "./nodes/parse-web-content";
import { transcribeAudio } from "./nodes/transcribe-audio";
import { processImageVision } from "./nodes/process-image-vision";
import { extractDocText } from "./nodes/extract-doc-text";
import { normalizeNote } from "./nodes/normalize-note";
import { correctCaption } from "./nodes/correct-caption";
import { detectContentType } from "./nodes/detect-content-type";
import { classifyIntent } from "./nodes/classify-intent";
import { detectEvent } from "./nodes/detect-event";
import { generateAiInsights } from "./nodes/generate-ai-insights";
import { organizeCollection } from "./nodes/organize-collection";
import { semanticChunker } from "./nodes/semantic-chunker";
import { generateEmbeddings } from "./nodes/generate-embeddings";
import { upsertVectors } from "./nodes/upsert-vectors";
import { logger } from "../../../shared/utils/logger";
import type { IngestionStateType, IngestionUpdate } from "./state";

const STATE_FIELDS = IngestionState.fields as unknown as Record<string, ZodType>;

const asText = (v: unknown): string => (v !== null && typeof v === "object" ? JSON.stringify(v) : String(v));

/** Second chance for a value a model returned in the wrong shape. */
function coerce(value: unknown): unknown {
  if (typeof value === "string") {
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n) ? n : value.trim().toLowerCase(); // "0.8" -> 0.8, "Existing" -> "existing"
  }
  if (Array.isArray(value)) return value.map(asText);
  if (value && typeof value === "object") {
    // A "flat object of strings" that came back with lists or nested objects.
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => [k, Array.isArray(v) ? v.map(asText).join(", ") : asText(v)]),
    );
  }
  return value;
}

/**
 * Model output is untrusted: LangGraph validates every update against the
 * state schema *after* a step returns, so one malformed field (a list where
 * the schema wants a string, "0.8" for a number) used to fail the whole save.
 * Each field is checked here instead, repaired if possible, else dropped.
 */
export function sanitize(name: string, memoryId: string, update: IngestionUpdate): IngestionUpdate {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    const field = STATE_FIELDS[key];
    if (!field || value === undefined) continue;
    let parsed = field.safeParse(value);
    if (!parsed.success) parsed = field.safeParse(coerce(value));
    if (parsed.success) clean[key] = parsed.data;
    else logger.warn({ memoryId, node: name, field: key }, "[ingestion] dropped a malformed model output");
  }
  return clean as IngestionUpdate;
}

/**
 * AI enrichment is optional: a provider error in one step (a rejected
 * parameter, a timeout, malformed JSON) must not throw away everything else.
 * The step's fields keep their defaults, the rest of the pipeline still runs,
 * and the memory is saved with whatever succeeded (e.g. a screenshot's OCR
 * text) instead of being marked failed.
 */
function optional(name: string, node: (state: IngestionStateType) => Promise<IngestionUpdate>) {
  return async (state: IngestionStateType): Promise<IngestionUpdate> => {
    try {
      return sanitize(name, state.memoryId, await node(state));
    } catch (err) {
      logger.warn({ err, memoryId: state.memoryId, node: name }, "[ingestion] enrichment step failed, continuing without it");
      return {};
    }
  };
}

// Mirrors docs/AI_REQUIREMENTS.md's ingestion state machine, plus four
// steps beyond the spec: CorrectCaption (spelling fixes for a caption typed
// alongside a link or attachment, never a note's own body), DetectContentType
// (open-vocabulary type + structured fields), DetectEvent (is this memory
// date-bound, so the app can offer a calendar event) and OrganizeCollection
// (file into an existing collection, propose a new one, or neither). The
// order they run in is drawn below the node list.
const PARSER_NODES = ["parseWebContent", "transcribeAudio", "processImageVision", "extractDocText", "normalizeNote"] as const;

const builder = new StateGraph(IngestionState)
  .addNode("parseWebContent", parseWebContent)
  .addNode("transcribeAudio", transcribeAudio)
  .addNode("processImageVision", processImageVision)
  .addNode("extractDocText", extractDocText)
  .addNode("normalizeNote", normalizeNote)
  .addNode("correctCaption", optional("correctCaption", correctCaption))
  .addNode("detectContentType", optional("detectContentType", detectContentType))
  .addNode("classifyIntent", optional("classifyIntent", classifyIntent))
  .addNode("detectEvent", optional("detectEvent", detectEvent))
  .addNode("generateAiInsights", optional("generateAiInsights", generateAiInsights))
  .addNode("organizeCollection", optional("organizeCollection", organizeCollection))
  .addNode("semanticChunker", semanticChunker)
  // Optional too: a bad or missing embeddings key never fails a save — the
  // memory is kept, just not findable by meaning until it's re-indexed.
  .addNode("generateEmbeddings", optional("generateEmbeddings", generateEmbeddings))
  .addNode("upsertVectors", upsertVectors)
  .addConditionalEdges(START, routeMediaType, {
    parseWebContent: "parseWebContent",
    transcribeAudio: "transcribeAudio",
    processImageVision: "processImageVision",
    extractDocText: "extractDocText",
    normalizeNote: "normalizeNote",
  });

// Steps run as soon as their inputs are ready, in parallel where they don't
// depend on each other. The longest chain is now caption -> intent ->
// insights -> collection (four model calls) instead of all six in a row.
//
//   parser ─┬─ correctCaption ── classifyIntent ─┬─ generateAiInsights ─┬─ organizeCollection ─┐
//           ├─ detectContentType ────────────────┤                      │                      ├─ upsertVectors
//           │                                    └─ detectEvent ────────┼──────────────────────┤
//           └─ semanticChunker ─────────────────────────────────────────┴─ generateEmbeddings ─┘
for (const parserNode of PARSER_NODES) {
  builder.addEdge(parserNode, "correctCaption");
  builder.addEdge(parserNode, "detectContentType");
  builder.addEdge(parserNode, "semanticChunker");
}

builder
  .addEdge("correctCaption", "classifyIntent")
  .addEdge(["detectContentType", "classifyIntent"], "generateAiInsights")
  .addEdge(["detectContentType", "classifyIntent"], "detectEvent")
  .addEdge("generateAiInsights", "organizeCollection")
  .addEdge(["generateAiInsights", "semanticChunker"], "generateEmbeddings")
  .addEdge(["organizeCollection", "generateEmbeddings", "detectEvent"], "upsertVectors")
  .addEdge("upsertVectors", END);

export const ingestionGraph = builder.compile();
