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
import { createUsageCallback, PLATFORM_AI_TAG } from "../ai-usage/usage-logger";
import { getSection } from "../instance-settings/instance-settings.service";
import { canUseIncludedAi, planHasManagedAi, type IncludedAiPurpose } from "../plans/plans.service";

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
 * The user's own key for a role (Settings -> AI). Every resolver below
 * returns null/[] rather than throwing when nothing is available, because
 * "no key yet" is an expected, common state (a brand-new signup), not a
 * failure — every call site treats that the same way it already treats a
 * flaky provider: skip this enrichment step, never fail the whole
 * memory/request over it.
 */
async function ownCredential(userId: string, role: AiRole): Promise<ProviderCredentialInput | null> {
  // On a plan with managed AI (AI included), the user's saved keys are kept
  // but not used — everything runs on included AI.
  if (await planHasManagedAi(userId)) return null;

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
/** Whether the user has their own key for a role — their own key is never quota-limited. */
export async function hasOwnCredential(userId: string, role: AiRole): Promise<boolean> {
  return !!(await ownCredential(userId, role));
}

/**
 * The platform's own key for a chat/vision role — "included AI" for plans
 * with an allowance. Set in Admin -> Infrastructure -> Included AI (or
 * PLATFORM_AI_* in env, which wins). A role left without its own key reuses
 * the Ask (reasoning) key when the provider is the same. Null when the role is off.
 */
export async function platformCredential(role: AiRole.FAST | AiRole.REASONING | AiRole.VISION): Promise<ProviderCredentialInput | null> {
  return platformCredentialFrom(await getSection("includedAi"), role);
}

/** platformCredential over a given section — also used to test unsaved settings. */
export function platformCredentialFrom(
  settings: Record<string, unknown>,
  role: AiRole.FAST | AiRole.REASONING | AiRole.VISION,
): ProviderCredentialInput | null {
  const str = (name: string) => (settings[name] ? String(settings[name]) : undefined);
  const provider = str(`${role}Provider`);
  const model = str(`${role}Model`);
  const sameAsAsk = provider === str("reasoningProvider");
  const apiKey = str(`${role}ApiKey`) ?? (sameAsAsk ? str("reasoningApiKey") : undefined);
  const baseUrl = str(`${role}BaseUrl`) ?? (sameAsAsk ? str("reasoningBaseUrl") : undefined);
  if (!provider || !apiKey || !model) return null;
  return { provider: provider as AiCredentialProvider, apiKey, model, baseUrl: baseUrl ?? null };
}

// Tag carried by every model built on the platform key; the usage logger
// turns it into metadata.source = "platform".
export { PLATFORM_AI_TAG };

interface ResolvedCredential {
  credential: ProviderCredentialInput;
  platform: boolean;
}

/**
 * The user's own key when they have one; otherwise included AI on the
 * platform's key, when the caller says what the call is for and the plan's
 * quota allows it (plans.service.ts canUseIncludedAi). No purpose = own key only.
 */
async function resolveCredential(
  userId: string,
  role: AiRole.FAST | AiRole.REASONING | AiRole.VISION,
  purpose?: IncludedAiPurpose,
): Promise<ResolvedCredential | null> {
  const own = await ownCredential(userId, role);
  if (own) return { credential: own, platform: false };
  if (!purpose) return null;
  const platform = await platformCredential(role);
  if (!platform) return null;
  if (!(await canUseIncludedAi(userId, purpose))) return null;
  return { credential: platform, platform: true };
}

// OpenAI's small embeddings model: 1536 dimensions, matching EMBEDDING_DIMENSIONS.
const FALLBACK_EMBEDDINGS_MODEL = "text-embedding-3-small";

/** The install's own embeddings key, or null when search by meaning can't work yet. */
export async function platformEmbeddingsCredential(): Promise<ProviderCredentialInput | null> {
  // EMBEDDINGS_* in env, or Admin -> Infrastructure -> Embeddings.
  const settings = await getSection("embeddings");
  if (settings.apiKey) {
    return {
      provider: String(settings.provider) as AiCredentialProvider,
      apiKey: String(settings.apiKey),
      baseUrl: settings.baseUrl ? String(settings.baseUrl) : null,
      model: String(settings.model),
    };
  }
  // No embeddings key of its own: reuse the Included AI key when it's
  // OpenAI's, so search by meaning works as soon as included AI does. Other
  // providers' embedding models differ in size, so they need Embeddings set.
  const included = await platformCredential(AiRole.REASONING);
  if (included?.provider === AiCredentialProvider.OPENAI) {
    return { provider: AiCredentialProvider.OPENAI, apiKey: included.apiKey, baseUrl: null, model: FALLBACK_EMBEDDINGS_MODEL };
  }
  return null;
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

function buildChatModel(credential: ProviderCredentialInput, tier: ModelTier, platform = false): BaseChatModel {
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
  const vector = await buildEmbeddings(credential).embedQuery("Savedly connection test");
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`This model returns ${vector.length}-dimensional vectors; Savedly needs ${EMBEDDING_DIMENSIONS}.`);
  }
}
