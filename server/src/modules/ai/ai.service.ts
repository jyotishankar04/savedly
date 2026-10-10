import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { AIMessage, HumanMessage, ToolMessage, type AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { db } from "../../db";
import { threads } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { logAiUsage } from "../ai-usage/usage-logger";
import { AiRole, PlanLimitType } from "../../db/enums";
import { isWithinLimit } from "../plans/plans.service";
import { hasOwnCredential, platformCredential } from "./ai.providers";
import { compiledRagGraph } from "./rag/graph";
import { askUnavailableMessage } from "./rag/nodes/agent";
import { ensureCheckpointerSetup } from "./rag/checkpointer";
import { INTERNAL_EVENT_TAG } from "./rag/internal-tag";
import { settlePending } from "./rag/tools/confirm";
import type { CreateThreadInput } from "./ai.schema";

// The synthetic "one user question" marker — distinct from the rag:* rows
// createUsageCallback logs per LLM call inside the pipeline (front_desk,
// agent, check_grounding can each fire more than once per question).
const ASK_QUERY_REQUEST_TYPE = "ask:query";

export interface ThreadResponse {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createThread(userId: string, input: CreateThreadInput): Promise<ThreadResponse> {
  await ensureCheckpointerSetup();
  const [row] = await db
    .insert(threads)
    .values({ userId, title: input.title ?? "New chat" })
    .returning();
  return row;
}

export async function listThreads(userId: string): Promise<ThreadResponse[]> {
  return db.select().from(threads).where(eq(threads.userId, userId)).orderBy(desc(threads.updatedAt));
}

async function requireOwnedThread(userId: string, threadId: string): Promise<ThreadResponse> {
  const [row] = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
  if (!row) throw new AppError("Thread not found", 404, "NOT_FOUND");
  return row;
}

export type ThreadMessagePart =
  | { type: "text"; text: string }
  | {
      type: "dynamic-tool";
      toolName: string;
      toolCallId: string;
      state: "output-available";
      output: { kwargs: { content: string; artifact?: unknown } };
    };

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  parts: ThreadMessagePart[];
}

/**
 * Reconstructs the same shape the live streaming path produces (text parts
 * + dynamic-tool parts wrapping a ToolMessage's content, matching what
 * @ai-sdk/langchain's toUIMessageStream emits) — the client renders both
 * through the identical component (SearchToolPart/MemoryAttachmentCards),
 * so a resumed thread looks the same as a live one instead of degrading to
 * text-only. Previously this only kept {role, content}, silently dropping
 * every tool call/search result on reload — confirmed live before this fix.
 *
 * One assistant entry per human turn, not one per AIMessage — a
 * checkGrounding retry produces a second AIMessage for the same turn, and
 * live streaming already renders that as one grouped assistant message, so
 * reload folds it the same way.
 */
export async function getThreadMessages(userId: string, threadId: string): Promise<ThreadMessage[]> {
  await requireOwnedThread(userId, threadId);
  const snapshot = await compiledRagGraph.getState({ configurable: { thread_id: threadId } });
  const raw = (snapshot.values.messages ?? []) as BaseMessage[];

  const result: ThreadMessage[] = [];
  let currentParts: ThreadMessagePart[] = [];
  let turnIndex = 0;

  const flushAssistant = () => {
    if (currentParts.length > 0) {
      result.push({ id: `assistant-${turnIndex}`, role: "assistant", parts: currentParts });
      currentParts = [];
    }
  };

  for (let i = 0; i < raw.length; i++) {
    const message = raw[i];

    if (message.getType() === "human") {
      flushAssistant();
      turnIndex += 1;
      const content = typeof message.content === "string" ? message.content : "";
      if (content) result.push({ id: `human-${turnIndex}`, role: "user", parts: [{ type: "text", text: content }] });
      continue;
    }

    if (AIMessage.isInstance(message)) {
      for (const toolCall of message.tool_calls ?? []) {
        const toolMessage = raw
          .slice(i + 1)
          .find((m): m is ToolMessage => ToolMessage.isInstance(m) && m.tool_call_id === toolCall.id);
        if (!toolMessage || !toolCall.id) continue;
        currentParts.push({
          type: "dynamic-tool",
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          state: "output-available",
          output: {
            kwargs: {
              content: typeof toolMessage.content === "string" ? toolMessage.content : JSON.stringify(toolMessage.content),
              // Same shape the live stream carries: tools like get_platform_help put UI data (button links) here.
              ...(toolMessage.artifact !== undefined ? { artifact: toolMessage.artifact } : {}),
            },
          },
        });
      }
      const text = typeof message.content === "string" ? message.content : "";
      if (text) currentParts.push({ type: "text", text });
    }
    // ToolMessage/SystemMessage entries aren't emitted as their own items —
    // ToolMessages are folded into the preceding AIMessage's parts above.
  }
  flushAssistant();

  return result;
}

/** streamEvents() surfaces every chat-model run inside the graph, including
 *  checkGrounding's internal structured-output call — drop anything tagged
 *  that way before it reaches the client (see nodes/check-grounding.ts). */
async function* filterInternalEvents<T extends { tags?: string[] }>(stream: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const event of stream) {
    if (event.tags?.includes(INTERNAL_EVENT_TAG)) continue;
    yield event;
  }
}

/** Streams a turn as a standard web Response (Vercel AI SDK UI Message
 *  Stream Protocol) — the controller pumps this into Express's res. Keeping
 *  the Response boundary here (not Node-stream-specific) preserves exact
 *  wire compatibility for a future client using @ai-sdk/react's useChat. */
export async function streamAsk(userId: string, threadId: string, query: string): Promise<Response> {
  await requireOwnedThread(userId, threadId);

  // Admission for included AI happens once per question, here: someone
  // without their own reasoning key rides on the platform's key only if the
  // plan's monthly question allowance has room. The "ask:query" row tagged
  // platform is both the quota count and the admission ticket every model
  // call in this turn checks (plans.service.ts canUseIncludedAi). Awaited,
  // not fire-and-forget, so the ticket exists before the graph runs.
  const ownKey = await hasOwnCredential(userId, AiRole.REASONING);
  const usesIncludedAi =
    !ownKey && !!(await platformCredential(AiRole.REASONING)) && (await isWithinLimit(userId, PlanLimitType.AI_MONTHLY_QUERIES, 1));

  // No way to answer (the plan's questions are used up, or no AI at all):
  // say why right away. Not counted as a question, and the graph isn't run —
  // its fallback message would never reach the stream.
  if (!ownKey && !usesIncludedAi) {
    const message = await askUnavailableMessage(userId);
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: "unavailable" });
          writer.write({ type: "text-delta", id: "unavailable", delta: message });
          writer.write({ type: "text-end", id: "unavailable" });
        },
      }),
    });
  }
  await logAiUsage({
    userId,
    requestType: ASK_QUERY_REQUEST_TYPE,
    provider: "internal",
    model: "n/a",
    threadId,
    metadata: usesIncludedAi ? { source: "platform" } : null,
  });
  await ensureCheckpointerSetup();

  // An action Ask asked about last turn runs only if this message, the
  // user's own, is a yes; anything else discards it (rag/tools/confirm.ts).
  const turnId = randomUUID();
  await settlePending(threadId, turnId, query);

  const eventStream = compiledRagGraph.streamEvents(
    // retryCount reset explicitly every turn — it's a LastValue channel, so
    // without this it stays capped at 1 forever after the first ungrounded
    // answer in a thread, silently disabling the retry loop on every later
    // turn (confirmed live before this fix).
    { messages: [new HumanMessage(query)], retryCount: 0 },
    {
      version: "v2",
      configurable: { thread_id: threadId },
      context: { userId, turnId, threadId },
    },
  );

  // toUIMessageStream's declared type (AsyncIterable<AIMessageChunk> |
  // ReadableStream) is stale relative to its own JSDoc, which documents
  // `toUIMessageStream(streamEvents)` — a LangGraph streamEvents() stream —
  // as supported usage. The filtered stream has the identical event shape,
  // just fewer events, so this is a type-only gap, not a runtime one.
  return createUIMessageStreamResponse({
    stream: toUIMessageStream(filterInternalEvents(eventStream) as unknown as AsyncIterable<AIMessageChunk>),
  });
}
