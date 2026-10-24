import { HumanMessage } from "@langchain/core/messages";
import { getTextFallbackModels, invokeWithFallback, type UsageContext } from "../../../ai.providers";
import { UNTRUSTED_RULE, wrapUntrusted } from "../../../untrusted";
import { logger } from "../../../../../shared/utils/logger";
import type { SocialPost } from "../../../url-processor";

// A video with captions only in another language (no English track, and
// YouTube won't translate that kind) gets its transcript translated here, so
// what's shown, searched and asked about is English. Lines keep their times:
// they go to the model numbered, in batches, and come back the same way.

const BATCH_LINES = 120;
const BATCH_TIMEOUT_MS = 60_000;

const isEnglish = (code: string) => code.split("-")[0] === "en";

async function translateBatch(lines: string[], from: string, usage: UsageContext, models: Awaited<ReturnType<typeof getTextFallbackModels>>): Promise<string[] | null> {
  const numbered = lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
  const answer = await invokeWithFallback(
    models,
    [
      new HumanMessage(
        `${UNTRUSTED_RULE}\n\nTranslate these lines of a video's captions (language code: ${from}) into natural English. ` +
          `Each line starts with its number and a tab. Answer with exactly the same number of lines, each as its number, a tab, then its English: ` +
          `no other text. Keep a line's meaning even if a sentence runs over to the next line, and keep names, numbers and technical terms. ` +
          `Leave "[music]" style markers and ♪ as they are.\n\n${wrapUntrusted(numbered, "captions")}`,
      ),
    ],
    usage,
    BATCH_TIMEOUT_MS,
  );
  const byNumber = new Map<number, string>();
  for (const row of answer.split("\n")) {
    const m = /^\s*(\d+)\t(.*)$/.exec(row);
    if (m) byNumber.set(Number(m[1]), m[2]!.trim());
  }
  // Every line must come back; a batch that lost some isn't used (the original stays).
  if (!lines.every((_, i) => byNumber.has(i + 1))) return null;
  return lines.map((_, i) => byNumber.get(i + 1)!);
}

/** The transcript in English: as it is when it already is, translated (keeping its times) when it isn't and a model is available, else as it was. */
export async function transcriptInEnglish(transcript: NonNullable<SocialPost["transcript"]>, usage: UsageContext): Promise<NonNullable<SocialPost["transcript"]>> {
  if (isEnglish(transcript.language) || transcript.translatedFrom || !usage.userId) return transcript;
  try {
    const models = await getTextFallbackModels(usage.userId, { kind: "save", memoryId: usage.memoryId ?? null });
    if (!models.length) return transcript;
    const segments: { start: number; text: string }[] = [];
    for (let at = 0; at < transcript.segments.length; at += BATCH_LINES) {
      const batch = transcript.segments.slice(at, at + BATCH_LINES);
      const translated = await translateBatch(batch.map((s) => s.text.replace(/\s+/g, " ")), transcript.language, usage, models);
      // One batch failing keeps that stretch in its own language rather than losing the transcript.
      batch.forEach((s, i) => segments.push({ start: s.start, text: translated?.[i] ?? s.text }));
    }
    return { language: "en", auto: true, translatedFrom: transcript.language, segments };
  } catch (error) {
    logger.warn({ error, memoryId: usage.memoryId }, "[ingestion] couldn't translate the transcript");
    return transcript;
  }
}
