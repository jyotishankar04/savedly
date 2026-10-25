/**
 * Tag for graph-internal model calls whose raw output must not reach the client stream.
 * ai.service.ts filters streamEvents() on it (check-grounding.ts and front-desk.ts use it).
 */
export const INTERNAL_EVENT_TAG = "internal:rag-graph";
