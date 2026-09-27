import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logger } from "../../../../shared/utils/logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";

interface EventDetection {
  hasEvent: boolean;
  eventAt: string | null;
  confidence: number;
}

const prompt = ChatPromptTemplate.fromTemplate(
  `Given the following captured content and what's already known about it, decide whether it describes a specific event, appointment, deadline, or other date-bound occasion (e.g. "team standup Friday at 10am", a saved Eventbrite/ticketing page, "submit the report by June 5", a wedding invite). Today's date is {today}.

If yes, resolve the date/time to an absolute ISO 8601 datetime (if a timezone isn't stated, use UTC) and rate your confidence from 0.0 to 1.0. If there's no clear date-bound event, or the date is too vague to resolve to a specific timestamp (e.g. "sometime next month"), return hasEvent: false.

Content type: {contentType}
Detected intent: {inferredIntent}
Content:
{content}

Context (title / domain / URL):
{context}

Respond as strict JSON: {{"hasEvent": true or false, "eventAt": "ISO string or null", "confidence": 0.0}}`,
);

// Deliberately deviates from every sibling classification node
// (classify-intent.ts, detect-content-type.ts, etc.), which have no
// try/catch and let a thrown error fail the whole ingestion job. Event
// detection is pure enrichment, not core to a memory existing — a flaky
// LLM call or a malformed date here must degrade to "no event detected,"
// never flip the memory to FAILED.
export async function detectEvent(state: IngestionStateType): Promise<IngestionUpdate> {
  const noContent = !state.rawContent && !state.correctedCaption && !state.caption;
  if (noContent) {
    return { detectedEventAt: null, eventDetectionConfidence: null };
  }

  try {
    const model = await getChatModel(state.userId, "fast");
    if (!model) {
      return { detectedEventAt: null, eventDetectionConfidence: null };
    }

    const context =
      [
        !isPlaceholderTitle(state.existingTitle) ? state.existingTitle : null,
        state.sourceDomain,
        state.url,
      ]
        .filter(Boolean)
        .join(" | ") || "(none available)";

    const chain = prompt.pipe(model).pipe(new JsonOutputParser<EventDetection>());
    const result = await chain.invoke(
      {
        today: new Date().toISOString(),
        contentType: state.contentType ?? "(unknown)",
        inferredIntent: state.inferredIntent ?? "(unknown)",
        content: (state.rawContent || state.correctedCaption || state.caption || "(none captured)").slice(0, 4000),
        context,
      },
      { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:detect_event", memoryId: state.memoryId })] },
    );

    if (!result.hasEvent || !result.eventAt || Number.isNaN(new Date(result.eventAt).getTime())) {
      logNode(state.memoryId, "detectEvent", { hasEvent: false });
      return { detectedEventAt: null, eventDetectionConfidence: null };
    }

    logNode(state.memoryId, "detectEvent", { hasEvent: true, eventAt: result.eventAt, confidence: result.confidence });
    return { detectedEventAt: result.eventAt, eventDetectionConfidence: result.confidence };
  } catch (err) {
    logger.warn({ err, memoryId: state.memoryId }, "[ingestion] detectEvent failed, degrading to no event");
    return { detectedEventAt: null, eventDetectionConfidence: null };
  }
}
