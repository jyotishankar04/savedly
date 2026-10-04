import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../../ai.providers";
import { createUsageCallback } from "../../../ai-usage/usage-logger";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

const prompt = ChatPromptTemplate.fromTemplate(
  `Fix only the spelling, grammar, and capitalization in the following short caption a user typed alongside something they saved. Preserve their meaning, tone, wording, and intent exactly — do not add information, do not rephrase beyond correcting errors, do not add a trailing period if there wasn't one.

Caption: {caption}

Respond with ONLY the corrected caption text, nothing else — no quotes, no explanation.`,
);

/** Never runs on a "note" — that's the memory's own body, not a caption alongside something else, and shouldn't be silently rewritten. */
export async function correctCaption(state: IngestionStateType): Promise<IngestionUpdate> {
  if (state.mediaType === "note" || !state.caption.trim()) {
    logNode(state.memoryId, "correctCaption", { skipped: state.mediaType === "note" ? "note body" : "no caption" });
    return { correctedCaption: null };
  }

  const model = await getChatModel(state.userId, "fast", { kind: "save", memoryId: state.memoryId });
  if (!model) {
    logNode(state.memoryId, "correctCaption", { skipped: "AI not configured" });
    return { correctedCaption: null };
  }

  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  const corrected = (
    await chain.invoke(
      { caption: state.caption },
      { callbacks: [createUsageCallback({ userId: state.userId, requestType: "ingestion:correct_caption", memoryId: state.memoryId })] },
    )
  ).trim();

  logNode(state.memoryId, "correctCaption", { original: state.caption, corrected });

  // Don't "correct" it into nothing, and don't bother persisting a no-op change.
  return { correctedCaption: corrected && corrected !== state.caption.trim() ? corrected : null };
}
