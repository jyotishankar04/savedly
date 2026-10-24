import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { MemoryType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { getChatModel } from "../ai/ai.providers";
import { createUsageCallback } from "../ai-usage/usage-logger";
import { UNTRUSTED_RULE, wrapUntrusted } from "../ai/untrusted";

export type RewriteMode = "fix" | "improve" | "shorten";

// The note editor's "Write with AI": the whole note, rewritten one of three
// ways, returned for the person to look at. Nothing is saved here; the editor
// replaces its text only when they choose to.

const TASKS: Record<RewriteMode, string> = {
  fix: "Correct spelling, grammar and punctuation only. Change nothing else: not the wording, the tone or the order. Where a misspelling could be more than one word, choose the one that fits what's around it (in a packing list, \"chargr\" is a charger).",
  improve: "Make it read better: clearer sentences, smoother flow, the same tone. Keep everything it says, and say nothing it doesn't.",
  shorten: "Make it shorter: cut repetition and filler, and tighten sentences, keeping every point and fact it makes.",
};

const prompt = ChatPromptTemplate.fromTemplate(
  `${UNTRUSTED_RULE}

You are editing a note someone wrote for themselves. The note is Markdown.

Task: {task}

Rules:
- Write in the note's own language.
- Keep its structure exactly: the same headings, lists, numbered lists and
  to-do items. A to-do item stays "- [ ] " or "- [x] " with its tick as it is.
  A callout stays "> [!NOTE]" followed by "> " lines.
- Leave code blocks, inline code, links (their addresses) and image lines
  exactly as they are.
- Add no facts, names, dates or numbers that aren't in the note.
- Answer with the rewritten note only, as Markdown: no introduction, no
  explanation, no code fence around it.

The note:
{note}`,
);

/** Up to this much of a note is rewritten at once; a longer one is best done a part at a time. */
export const REWRITE_MAX_CHARS = 20_000;

export async function rewriteNote(userId: string, memoryId: string, input: { mode: RewriteMode; markdown: string }): Promise<{ markdown: string }> {
  const [note] = await db
    .select({ type: memories.type })
    .from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .limit(1);
  if (!note) throw new AppError("Memory not found", 404, "NOT_FOUND");
  if (note.type !== MemoryType.NOTE) throw new AppError("Only a note can be rewritten.", 400, "NOT_A_NOTE");
  if (!input.markdown.trim()) throw new AppError("The note is empty.", 400, "EMPTY_NOTE");

  // Part of the note's own AI processing for the month: the first AI use on a
  // note this month counts as one AI save (canUseIncludedAi), later ones don't.
  const model = await getChatModel(userId, "fast", { kind: "save", memoryId });
  if (!model) {
    throw new AppError("AI isn't available right now: this month's AI saves are used up, or no AI key is set.", 403, "AI_UNAVAILABLE");
  }

  const text = await prompt.pipe(model).pipe(new StringOutputParser()).invoke(
    { task: TASKS[input.mode], note: wrapUntrusted(input.markdown, "note") },
    // Logged as part of the note's processing ("ingestion:" rows are what an AI save counts).
    { callbacks: [createUsageCallback({ userId, requestType: "ingestion:note_rewrite", memoryId })] },
  );

  // A model that wraps its answer in a fence anyway.
  const markdown = text.trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1").trim();
  if (!markdown) throw new AppError("The AI came back empty. Try again.", 502, "AI_EMPTY");
  return { markdown };
}
