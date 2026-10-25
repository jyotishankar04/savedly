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
 * Per-tier call settings, shared by live calls and the Settings test, so a role that passes its
 * test works in ingestion. Fast/vision get a low temperature where allowed, and OpenAI reasoning
 * models low effort (gpt-5-nano spent ~3,000 hidden tokens per screenshot at the default).
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

/**
 * Groq and Anthropic have no embeddings API — throws, since this is only ever reached via a code
 * path that already excludes them (the settings UI's provider choices for the embeddings role, and
 * testCredential below).
 */
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

// Fast tier: small extraction/classification calls in ingestion. Reasoning tier: Ask Savedly and
// anything needing judgment. Both are the user's chosen model for that role. `purpose` lets the
// call fall back to included AI when there's no own key (see resolveCredential).
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
 * A model on the instance's own key, for work done on nobody's behalf (the public help box).
 * There's no plan to check, so the caller must bound the cost.
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
 * Returned with provider and model so usage logs show the real choice. The user's own embeddings
 * credential wins; otherwise the platform's (EMBEDDINGS_API_KEY).
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

// Under bring-your-own-key there's one model per role, so this wraps getChatModel and keeps
// existing invokeWithFallback call sites working.
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
