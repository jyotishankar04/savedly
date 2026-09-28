import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { aiCredentials, userAiRoleAssignments } from "../../db/schema";
import { AiCredentialProvider, AiRole } from "../../db/enums";
import { EMBEDDING_DIMENSIONS } from "../../db/pgvector-type";
import { decryptToken } from "../../shared/crypto/token-cipher";
import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { createUsageCallback } from "../ai-usage/usage-logger";
import { getSection } from "../instance-settings/instance-settings.service";

export interface UsageContext {
  userId: string | null;
  requestType: string;
  memoryId?: string | null;
  threadId?: string | null;
}

// Google's Gemini API ships an OpenAI-compatibility layer covering chat,
// vision, and embeddings — reusing ChatOpenAI/OpenAIEmbeddings against this
// base URL avoids needing a dedicated @langchain/google-genai integration
// just for one more preset. Anthropic gets a real dedicated client below
// because its wire format (tool-calling, message shape) isn't OpenAI-
// compatible at all.
const GOOGLE_OPENAI_COMPAT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface ProviderCredentialInput {
  provider: AiCredentialProvider;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
}

/**
 * Every user brings and pays for their own AI provider account — this
 * server never holds an AI API key of its own (see .env.example: there is
 * deliberately no GROQ_API_KEY/OPENAI_API_KEY here anymore). Every resolver
 * below returns null/[] rather than throwing when a role isn't configured,
 * because "no key yet" is an expected, common state (a brand-new signup),
 * not a failure — every call site treats that the same way it already
 * treats a flaky provider: skip this enrichment step, never fail the whole
 * memory/request over it.
 */
async function resolveCredential(userId: string, role: AiRole): Promise<ProviderCredentialInput | null> {
  const [row] = await db
    .select({
      provider: aiCredentials.provider,
      encryptedApiKey: aiCredentials.encryptedApiKey,
      baseUrl: aiCredentials.baseUrl,
      model: userAiRoleAssignments.model,
    })
    .from(userAiRoleAssignments)
    .innerJoin(aiCredentials, eq(userAiRoleAssignments.credentialId, aiCredentials.id))
    .where(and(eq(userAiRoleAssignments.userId, userId), eq(userAiRoleAssignments.role, role)))
    .limit(1);

  if (!row) return null;

  try {
    return { provider: row.provider, apiKey: decryptToken(row.encryptedApiKey), baseUrl: row.baseUrl, model: row.model };
  } catch (err) {
    logger.error({ err, userId, role }, "resolveCredential: failed to decrypt stored API key");
    return null;
  }
}

/**
 * The one platform-funded exception to BYOK — see .env.example's note above
 * EMBEDDINGS_API_KEY. Returns null when unset, so a deployment that leaves
 * it blank gets exactly the old fully-BYOK embeddings behavior.
 */
async function platformEmbeddingsCredential(): Promise<ProviderCredentialInput | null> {
  // EMBEDDINGS_* in env, or Admin -> Infrastructure -> Embeddings on a
  // self-hosted install.
  const settings = await getSection("embeddings");
  if (!settings.apiKey) return null;
  return {
    provider: String(settings.provider) as AiCredentialProvider,
    apiKey: String(settings.apiKey),
    baseUrl: settings.baseUrl ? String(settings.baseUrl) : null,
    model: String(settings.model),
  };
}

function openAiCompatBaseUrl(credential: ProviderCredentialInput): string | undefined {
  if (credential.provider === AiCredentialProvider.GOOGLE) return GOOGLE_OPENAI_COMPAT_BASE_URL;
  if (credential.provider === AiCredentialProvider.CUSTOM) return credential.baseUrl ?? undefined;
  if (credential.provider === AiCredentialProvider.OPENROUTER) return OPENROUTER_BASE_URL;
  return undefined;
}

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

function buildChatModel(credential: ProviderCredentialInput, tier: ModelTier): BaseChatModel {
  const { temperature, reasoningEffort } = tierOptions(credential, tier);
  switch (credential.provider) {
    case AiCredentialProvider.GROQ:
      return new ChatGroq({ apiKey: credential.apiKey, model: credential.model, temperature });
    case AiCredentialProvider.ANTHROPIC:
      return new ChatAnthropic({ apiKey: credential.apiKey, model: credential.model, temperature });
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
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        ...(baseURL ? { configuration: { baseURL } } : {}),
      });
    }
  }
}

/** Groq and Anthropic have no embeddings API — throws, since this is only ever reached via a code path that already excludes them (the settings UI's provider choices for the embeddings role, and testCredential below). */
function buildEmbeddings(credential: ProviderCredentialInput): EmbeddingsInterface {
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
// Reasoning tier: the Ask SaveForLatter agent and anything needing real
// judgment. Both are just the user's own chosen model for that role now —
// see docs/AI_REQUIREMENTS.md for the original two-tier design this mirrors.
export async function getChatModel(userId: string, tier: "fast" | "reasoning"): Promise<BaseChatModel | null> {
  const credential = await resolveCredential(userId, tier === "fast" ? AiRole.FAST : AiRole.REASONING);
  if (!credential) return null;
  return buildChatModel(credential, tier);
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
  const credential = (await resolveCredential(userId, AiRole.EMBEDDINGS)) ?? (await platformEmbeddingsCredential());
  if (!credential) return null;
  try {
    return { client: buildEmbeddings(credential), provider: credential.provider, model: credential.model };
  } catch (err) {
    logger.error({ err, userId }, "getEmbeddings: failed to build embeddings client");
    return null;
  }
}

export async function getVisionModels(userId: string): Promise<BaseChatModel[]> {
  const credential = await resolveCredential(userId, AiRole.VISION);
  if (!credential) return [];
  return [buildChatModel(credential, "vision")];
}

// Previously two different *providers* (Groq + OpenAI) so one outage
// couldn't take down both the primary and fallback attempt. Under BYOK
// there's exactly one model per role — this now just wraps getChatModel so
// every existing invokeWithFallback call site keeps working unchanged.
export async function getTextFallbackModels(userId: string): Promise<BaseChatModel[]> {
  const model = await getChatModel(userId, "fast");
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

export interface TestCredentialResult {
  ok: boolean;
  error?: string;
  /** Only set for role "embeddings" — the settings UI surfaces this so a dimension mismatch is a clear, specific error rather than a generic failure. */
  dimensions?: number;
}

/**
 * A real, live call against the provider using credentials straight from
 * the request body (never persisted plaintext) — used both by the "test
 * connection" endpoint and by assignRole (ai-settings.service.ts), which
 * requires a passing test before it will save a role assignment. This is
 * the only place a non-1536-dim embedding model gets caught, since nothing
 * in this codebase can know a model's output width without actually calling it.
 */
export async function testRoleCredential(input: ProviderCredentialInput, role: AiRole): Promise<TestCredentialResult> {
  try {
    if (role === AiRole.EMBEDDINGS) {
      const embeddings = buildEmbeddings(input);
      const vector = await embeddings.embedQuery("connection test");
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        return {
          ok: false,
          dimensions: vector.length,
          error: `This model produced ${vector.length}-dimensional vectors — embeddings must be exactly ${EMBEDDING_DIMENSIONS}-dimensional (e.g. OpenAI's text-embedding-3-small, or an equivalent on another provider).`,
        };
      }
      return { ok: true, dimensions: vector.length };
    }

    const model = buildChatModel(input, role === AiRole.FAST ? "fast" : role === AiRole.VISION ? "vision" : "reasoning");
    await model.invoke([new HumanMessage("Reply with the single word: ok")], { timeout: 15000 });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    return { ok: false, error: message };
  }
}

/** Admin -> Infrastructure's "Test connection" for the embeddings key: one real embedding call. */
export async function testEmbeddingsCredential(credential: ProviderCredentialInput): Promise<void> {
  const vector = await buildEmbeddings(credential).embedQuery("SaveForLatter connection test");
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`This model returns ${vector.length}-dimensional vectors; SaveForLatter needs ${EMBEDDING_DIMENSIONS}.`);
  }
}
