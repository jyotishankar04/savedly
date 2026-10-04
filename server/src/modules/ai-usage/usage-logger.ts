import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { mergeConfigs, type RunnableConfig } from "@langchain/core/runnables";
import type { ChatGeneration, LLMResult } from "@langchain/core/outputs";
import { db } from "../../db";
import { aiUsageLogs } from "../../db/schema";
import { logger } from "../../shared/utils/logger";

// Kept here (not imported from ai.providers.ts) so this module stays free of
// the providers' import graph; ai.providers.ts re-exports the same value.
export const PLATFORM_AI_TAG = "sfl:platform";

export interface LogAiUsageEntry {
  userId: string | null;
  requestType: string;
  provider: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  threadId?: string | null;
  memoryId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Never throws — a usage-logging failure must never fail the AI call it's
 * instrumenting, same "degrade, don't fail" convention as the rest of this
 * pipeline (see ingestion/nodes/lib/analyze-image.ts etc).
 */
export async function logAiUsage(entry: LogAiUsageEntry): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({
      userId: entry.userId,
      requestType: entry.requestType,
      provider: entry.provider,
      model: entry.model,
      promptTokens: entry.promptTokens ?? null,
      completionTokens: entry.completionTokens ?? null,
      totalTokens: entry.totalTokens ?? null,
      threadId: entry.threadId ?? null,
      memoryId: entry.memoryId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    logger.warn({ err, requestType: entry.requestType }, "logAiUsage: failed to persist usage row");
  }
}

/** Maps a LangChain `Serialized.id` (e.g. ["langchain","chat_models","groq","ChatGroq"]) to our provider vocabulary. */
function providerFromClassName(className: string): string {
  if (className.includes("Groq")) return "groq";
  if (className.includes("OpenAI")) return "openai";
  return className.toLowerCase();
}

interface UsageCallbackParams {
  userId: string | null;
  requestType: string;
  memoryId?: string | null;
  threadId?: string | null;
}

/**
 * A callback-handler factory passed as the second argument to a chat
 * model's (or LCEL chain's) `.invoke()` — LangChain surfaces every model
 * call through it regardless of how deeply it's wrapped in `.pipe()` or
 * `.withStructuredOutput()`, which is why this exists instead of reading
 * `response.usage_metadata` at each call site directly (most of those
 * sites only ever see the parsed/structured output, never the raw
 * AIMessage carrying that field).
 */
export function createUsageCallback(params: UsageCallbackParams): BaseCallbackHandler {
  let className = "unknown";
  let platform = false;

  return BaseCallbackHandler.fromMethods({
    // Chat models reach this through LangChain's handleChatModelStart ->
    // handleLLMStart fallback, which passes the run's tags along — a model
    // built on the platform's key (included AI) carries PLATFORM_AI_TAG.
    handleLLMStart(llm, _prompts, _runId, _parentRunId, _extraParams, tags) {
      className = llm.id?.at(-1) ?? "unknown";
      platform = !!tags?.includes(PLATFORM_AI_TAG);
    },
    handleLLMEnd(output: LLMResult) {
      const generation = output.generations[0]?.[0] as (ChatGeneration & { message?: unknown }) | undefined;
      const message = generation && "message" in generation ? (generation.message as { usage_metadata?: { input_tokens: number; output_tokens: number; total_tokens: number }; response_metadata?: Record<string, unknown> }) : undefined;

      const usage = message?.usage_metadata;
      const model = (message?.response_metadata?.model_name as string) ?? (message?.response_metadata?.model as string) ?? className;

      void logAiUsage({
        userId: params.userId,
        requestType: params.requestType,
        provider: providerFromClassName(className),
        model,
        promptTokens: usage?.input_tokens ?? null,
        completionTokens: usage?.output_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
        threadId: params.threadId ?? null,
        memoryId: params.memoryId ?? null,
        // What plans.service.ts counts against a plan's included-AI quota.
        metadata: platform ? { source: "platform" } : null,
      });
    },
  }) as unknown as BaseCallbackHandler;
}

/**
 * Config for a model call made inside a graph node: keeps the node's own
 * config (and with it the callbacks LangGraph's streamEvents and Langfuse
 * rely on) and adds the usage logger. Passing `{ callbacks: [...] }` alone
 * *replaces* the inherited callbacks, which silently stopped Ask from
 * streaming its answer to the browser.
 */
export function withUsage(config: RunnableConfig | undefined, params: UsageCallbackParams, extra?: RunnableConfig): RunnableConfig {
  return mergeConfigs(config, extra, { callbacks: [createUsageCallback(params)] });
}
