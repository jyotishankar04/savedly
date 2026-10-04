import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logger } from "../../../../shared/utils/logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";
import { isPlaceholderTitle } from "../title";
import { planHasFeature } from "../../../plans/plans.service";
import { localNow, userTimeZone, utcOffset } from "../../../../shared/utils/time-zone";

interface EventDetection {
  hasEvent: boolean;
  eventAt: string | null;
  confidence: number;
}

const prompt = ChatPromptTemplate.fromTemplate(
  `Given the following captured content and what's already known about it, decide whether it describes a specific event, appointment, deadline, or other date-bound occasion (e.g. "team standup Friday at 10am", a saved Eventbrite/ticketing page, "submit the report by June 5", a wedding invite). Right now it's {today} for the user, whose time zone is {timeZone}.

If yes, resolve the date/time to an absolute ISO 8601 datetime and rate your confidence from 0.0 to 1.0. A time with no time zone stated ("3 pm", "Friday 10am") is in the user's time zone: write it with that zone's UTC offset, e.g. "2026-10-02T15:00:00{offsetExample}". Relative dates ("next Friday", "tomorrow") count from the user's today. If there's no clear date-bound event, or the date is too vague to resolve to a specific timestamp (e.g. "sometime next month"), return hasEvent: false.

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
  // Finding events is a plan feature; without it this step is skipped (and
  // costs no AI).
  if (noContent || !(await planHasFeature(state.userId, "aiEventDetection"))) {
    return { detectedEventAt: null, eventDetectionConfidence: null };
  }

  try {
    const model = await getChatModel(state.userId, "fast", { kind: "save", memoryId: state.memoryId });
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

    const timeZone = await userTimeZone(state.userId);
    const chain = prompt.pipe(model).pipe(new JsonOutputParser<EventDetection>());
    const result = await chain.invoke(
      {
        today: localNow(timeZone),
        timeZone,
        offsetExample: utcOffset(timeZone),
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

    // Stored as UTC; the offset the model wrote is what places it correctly.
    const eventAt = new Date(result.eventAt).toISOString();
    logNode(state.memoryId, "detectEvent", { hasEvent: true, eventAt, timeZone, confidence: result.confidence });
    return { detectedEventAt: eventAt, eventDetectionConfidence: result.confidence };
  } catch (err) {
    logger.warn({ err, memoryId: state.memoryId }, "[ingestion] detectEvent failed, degrading to no event");
    return { detectedEventAt: null, eventDetectionConfidence: null };
  }
}

