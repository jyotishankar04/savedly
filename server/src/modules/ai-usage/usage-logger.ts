import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { mergeConfigs, type RunnableConfig } from "@langchain/core/runnables";
import type { ChatGeneration, LLMResult } from "@langchain/core/outputs";
import { db } from "../../db";
import { aiUsageLogs } from "../../db/schema";
import { logger } from "../../shared/utils/logger";
import { providerRefusal, recordAiWorking, recordNoCredits } from "./provider-health";

// Kept here, not imported from ai.providers.ts, so this module avoids the providers' import graph.
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

/** Never throws: a logging failure must not fail the AI call it instruments. */
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
 * Callback passed to a model's `.invoke()`: LangChain reports every call through it however deeply
 * wrapped.
 */
export function createUsageCallback(params: UsageCallbackParams): BaseCallbackHandler {
  let className = "unknown";
  let platform = false;

  return BaseCallbackHandler.fromMethods({
    // Chat models arrive via handleChatModelStart -> handleLLMStart, which keeps the run's tags; a
    // platform-key model carries PLATFORM_AI_TAG.
    handleLLMStart(llm, _prompts, _runId, _parentRunId, _extraParams, tags) {
      className = llm.id?.at(-1) ?? "unknown";
      platform = !!tags?.includes(PLATFORM_AI_TAG);
    },
    // The instance's own AI account running dry is silent (steps are skipped), so it's recorded for
    // admins (ai/provider-health.ts). A user's own key is theirs.
    handleLLMError(err: unknown) {
      if (platform && providerRefusal(err) === "no-credits") recordNoCredits(providerFromClassName(className));
    },
    handleLLMEnd(output: LLMResult) {
      if (platform) recordAiWorking();
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
 * Config for a model call in a graph node: keeps the node's callbacks (streamEvents, Langfuse) and
 * adds usage logging. Passing `{ callbacks }` alone replaces them and stopped Ask streaming.
 */
export function withUsage(config: RunnableConfig | undefined, params: UsageCallbackParams, extra?: RunnableConfig): RunnableConfig {
  return mergeConfigs(config, extra, { callbacks: [createUsageCallback(params)] });
}
