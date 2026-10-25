import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type { BaseMessage } from "@langchain/core/messages";
import { AiCredentialProvider, AiRole } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { createUsageCallback, PLATFORM_AI_TAG } from "../ai-usage/api";
import { type IncludedAiPurpose } from "../plans/api";
import { openAiCompatBaseUrl, ownCredential, platformCredential, platformEmbeddingsCredential, resolveCredential, type ProviderCredentialInput, type UsageContext } from "./credentials";

type ModelTier = "fast" | "reasoning" | "vision";

/** Model IDs can carry a vendor prefix, e.g. OpenRouter's "openai/gpt-5-nano". */
const bareModelId = (model: string) => model.toLowerCase().replace(/^.*\//, "");

/** OpenAI's reasoning models: the o-series and the GPT-5 family. */
const isOpenAiReasoningModel = (model: string) => /^(o\d|gpt-5)/.test(bareModelId(model));

// These reject any temperature except the default with a 400 ("Only the
// default (1) value is supported") — OpenAI's reasoning models, and Claude
// from Opus 4.7 on. Sending one crashed every Fast-role step of ingestion.
function rejectsCustomTemperature(model: string): boolean {
  const id = bareModelId(model);
  return isOpenAiReasoningModel(id) || /^claude-(opus-4-[7-9]|opus-[5-9]|sonnet-[5-9]|fable|mythos)/.test(id);
}

/**
 * Per-tier call settings, used by live calls AND the Settings test, so a role
 * that passes its test is known to work in ingestion with these exact options.
 * Fast/vision jobs are short classification and description tasks: they get a
 * low temperature where the model allows one, and OpenAI reasoning models get
 * low reasoning effort (at the default, gpt-5-nano spent ~3,000 hidden tokens
 * per screenshot, making saves slow and costly).
 */
function tierOptions(credential: ProviderCredentialInput, tier: ModelTier): { temperature?: number; reasoningEffort?: "low" } {
  const quickJob = tier === "fast" || tier === "vision";
  return {
    temperature: tier === "fast" && !rejectsCustomTemperature(credential.model) ? 0.2 : undefined,
    reasoningEffort:
      quickJob && credential.provider === AiCredentialProvider.OPENAI && isOpenAiReasoningModel(credential.model) ? "low" : undefined,
  };
}

export function buildChatModel(credential: ProviderCredentialInput, tier: ModelTier, platform = false): BaseChatModel {
  const { temperature, reasoningEffort } = tierOptions(credential, tier);
  const tags = platform ? [PLATFORM_AI_TAG] : undefined;
  switch (credential.provider) {
    case AiCredentialProvider.GROQ:
      return new ChatGroq({ apiKey: credential.apiKey, model: credential.model, temperature, tags });
    case AiCredentialProvider.ANTHROPIC:
      return new ChatAnthropic({ apiKey: credential.apiKey, model: credential.model, temperature, tags });
    case AiCredentialProvider.OPENAI:
    case AiCredentialProvider.GOOGLE:
    case AiCredentialProvider.CUSTOM:
    case AiCredentialProvider.OPENROUTER:
    default: {
      const baseURL = openAiCompatBaseUrl(credential);
      return new ChatOpenAI({
        apiKey: credential.apiKey,
        model: credential.model,
        temperature,
        tags,
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        ...(baseURL ? { configuration: { baseURL } } : {}),
      });
    }
  }
}

/** Groq and Anthropic have no embeddings API — throws, since this is only ever reached via a code path that already excludes them (the settings UI's provider choices for the embeddings role, and testCredential below). */
export function buildEmbeddings(credential: ProviderCredentialInput): EmbeddingsInterface {
  if (credential.provider === AiCredentialProvider.GROQ || credential.provider === AiCredentialProvider.ANTHROPIC) {
    throw new Error(`${credential.provider} has no embeddings API`);
  }
  const baseURL = openAiCompatBaseUrl(credential);
  return new OpenAIEmbeddings({
    apiKey: credential.apiKey,
    model: credential.model,
    ...(baseURL ? { configuration: { baseURL } } : {}),
  });
}

// Fast tier: extraction/tagging/classification — every ingestion node's
// small, normal-question-shaped calls (fill in this field, classify this
// into one of N buckets, write a 2-3 sentence summary).
// Reasoning tier: the Ask Savedly agent and anything needing real
// judgment. Both are just the user's own chosen model for that role now —
// see docs/AI_REQUIREMENTS.md for the original two-tier design this mirrors.
// `purpose` says what the call is for, which is what lets it fall back to
// included AI when the user has no key of their own (see resolveCredential).
export async function getChatModel(
  userId: string,
  tier: "fast" | "reasoning",
  purpose?: IncludedAiPurpose,
): Promise<BaseChatModel | null> {
  const resolved = await resolveCredential(userId, tier === "fast" ? AiRole.FAST : AiRole.REASONING, purpose);
  if (!resolved) return null;
  return buildChatModel(resolved.credential, tier, resolved.platform);
}

/**
 * A model on the instance's own key, for work done on nobody's behalf (the
 * public help box). No account means no plan allowance to check: the caller
 * must bound the cost itself.
 */
export async function getPlatformChatModel(tier: "fast" | "reasoning"): Promise<BaseChatModel | null> {
  const credential = await platformCredential(tier === "fast" ? AiRole.FAST : AiRole.REASONING);
  return credential ? buildChatModel(credential, tier, true) : null;
}

export interface ResolvedEmbeddings {
  client: EmbeddingsInterface;
  provider: AiCredentialProvider;
  model: string;
}

/**
 * Bundled with provider/model (not just the client) so every call site's
 * usage log reflects the actual choice instead of a hardcoded
 * "openai"/"text-embedding-3-small". A user's own configured embeddings
 * credential always wins when they have one; otherwise this falls back to
 * the platform's own (EMBEDDINGS_API_KEY) — the one role that isn't purely
 * BYOK, see the comment on platformEmbeddingsCredential above.
 */
export async function getEmbeddings(userId: string): Promise<ResolvedEmbeddings | null> {
  const credential = (await ownCredential(userId, AiRole.EMBEDDINGS)) ?? (await platformEmbeddingsCredential());
  if (!credential) return null;
  try {
    return { client: buildEmbeddings(credential), provider: credential.provider, model: credential.model };
  } catch (err) {
    logger.error({ err, userId }, "getEmbeddings: failed to build embeddings client");
    return null;
  }
}

/** Reading an image is part of processing a save, so it counts against the same allowance. */
export async function getVisionModels(userId: string, memoryId: string | null): Promise<BaseChatModel[]> {
  const resolved = await resolveCredential(userId, AiRole.VISION, { kind: "save", memoryId });
  if (!resolved) return [];
  return [buildChatModel(resolved.credential, "vision", resolved.platform)];
}

// Previously two different *providers* (Groq + OpenAI) so one outage
// couldn't take down both the primary and fallback attempt. Under BYOK
// there's exactly one model per role — this now just wraps getChatModel so
// every existing invokeWithFallback call site keeps working unchanged.
export async function getTextFallbackModels(userId: string, purpose?: IncludedAiPurpose): Promise<BaseChatModel[]> {
  const model = await getChatModel(userId, "fast", purpose);
  return model ? [model] : [];
}

export async function invokeWithFallback(
  models: BaseChatModel[],
  messages: BaseMessage[],
  usage: UsageContext,
  timeoutMs = 20000,
): Promise<string> {
  if (models.length === 0) return "";

  for (const model of models) {
    try {
      const response = await model.invoke(messages, { timeout: timeoutMs, callbacks: [createUsageCallback(usage)] });
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      return content;
    } catch (err) {
      logger.warn({ err, model: model.constructor.name }, "invokeWithFallback: model attempt failed, trying next");
    }
  }
  logger.error("invokeWithFallback: every model in the fallback list failed");
  return "";
}
