import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { AIMessage, HumanMessage, ToolMessage, type AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { db } from "../../db";
import { threads } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { logAiUsage } from "../ai-usage/api";
import { AiRole, PlanLimitType } from "../../db/enums";
import { isWithinLimit } from "../plans/api";
import { hasOwnCredential, platformCredential } from "./credentials";
import { compiledRagGraph } from "./rag/graph";
import { askUnavailableMessage } from "./rag/nodes/agent";
import { ensureCheckpointerSetup } from "./rag/checkpointer";
import { INTERNAL_EVENT_TAG } from "./rag/internal-tag";
import { settlePending } from "./rag/tools/confirm";
import type { CreateThreadInput } from "./ai.schema";

// Marks one user question, unlike the rag:* rows logged per LLM call (several per question).
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
 * Rebuilds what live streaming produces (text and tool parts) so a resumed thread renders the same.
 * One assistant entry per human turn: a checkGrounding retry is folded in.
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
              // Same shape as the live stream: tools like get_platform_help put UI data (button links) here.
              ...(toolMessage.artifact !== undefined ? { artifact: toolMessage.artifact } : {}),
            },
          },
        });
      }
      const text = typeof message.content === "string" ? message.content : "";
      if (text) currentParts.push({ type: "text", text });
    }
  }
  flushAssistant();

  return result;
}

/** Drops internally tagged runs (checkGrounding's structured-output call) before they reach the client. */
async function* filterInternalEvents<T extends { tags?: string[] }>(stream: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const event of stream) {
    if (event.tags?.includes(INTERNAL_EVENT_TAG)) continue;
    yield event;
  }
}

/** Streams a turn as a web Response (Vercel AI SDK UI Message Stream Protocol), compatible with useChat. */
export async function streamAsk(userId: string, threadId: string, query: string): Promise<Response> {
  await requireOwnedThread(userId, threadId);

  // Included-AI admission, once per question: without their own reasoning key a user rides the
  // platform key only if the plan has question room. The platform-tagged "ask:query" row is both
  // the count and the ticket model calls check; awaited so it exists before the graph runs.
  const ownKey = await hasOwnCredential(userId, AiRole.REASONING);
  const usesIncludedAi =
    !ownKey && !!(await platformCredential(AiRole.REASONING)) && (await isWithinLimit(userId, PlanLimitType.AI_MONTHLY_QUERIES, 1));

  // Can't answer (quota used or no AI): say why now, don't count it, and skip the graph, whose
  // fallback never reaches the stream.
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

  // An action Ask asked about last turn runs only if this message (the user's own) is a yes
  // (rag/tools/confirm.ts).
  const turnId = randomUUID();
  await settlePending(threadId, turnId, query);

  const eventStream = compiledRagGraph.streamEvents(
    // retryCount is a LastValue channel: reset it each turn or it stays capped and disables the retry loop.
    { messages: [new HumanMessage(query)], retryCount: 0 },
    {
      version: "v2",
      configurable: { thread_id: threadId },
      context: { userId, turnId, threadId },
    },
  );

  // toUIMessageStream's declared type is stale against its JSDoc (streamEvents is supported); the
  // shape is the same, so it's a type-only gap.
  return createUIMessageStreamResponse({
    stream: toUIMessageStream(filterInternalEvents(eventStream) as unknown as AsyncIterable<AIMessageChunk>),
  });
}
