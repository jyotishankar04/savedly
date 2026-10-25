import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { aiCredentials, userAiRoleAssignments } from "../../db/schema";
import { AiCredentialProvider, AiRole } from "../../db/enums";
import { decryptToken } from "../../shared/crypto/token-cipher";
import { logger } from "../../shared/utils/logger";
import { getSection } from "../../platform/instance-settings/instance-settings.service";
import { canUseIncludedAi, planHasManagedAi, type IncludedAiPurpose } from "../plans/api";

export interface UsageContext {
  userId: string | null;
  requestType: string;
  memoryId?: string | null;
  threadId?: string | null;
}

// Gemini's OpenAI-compatible layer covers chat, vision and embeddings, so
// ChatOpenAI/OpenAIEmbeddings can be reused instead of a dedicated Google integration.
const GOOGLE_OPENAI_COMPAT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface ProviderCredentialInput {
  provider: AiCredentialProvider;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
}

/**
 * The user's own key for a role (Settings -> AI). Resolvers return null/[] instead of throwing: "no
 * key yet" is a normal state, and callers skip that step.
 */
export async function ownCredential(userId: string, role: AiRole): Promise<ProviderCredentialInput | null> {
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

/** The one platform-funded exception to bring-your-own-key (EMBEDDINGS_API_KEY). Null when unset. */
/** Whether the user has their own key for a role — their own key is never quota-limited. */
export async function hasOwnCredential(userId: string, role: AiRole): Promise<boolean> {
  return !!(await ownCredential(userId, role));
}

/**
 * The platform's key for a chat/vision role ("included AI"), set in Admin -> Infrastructure or
 * PLATFORM_AI_* (which wins). A role without its own key reuses the reasoning key when the provider
 * matches. Null when the role is off.
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

interface ResolvedCredential {
  credential: ProviderCredentialInput;
  platform: boolean;
}

/**
 * The user's own key, else included AI on the platform key when the caller says what the call is
 * for and the plan's quota allows it. No purpose = own key only.
 */
export async function resolveCredential(
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

export function openAiCompatBaseUrl(credential: ProviderCredentialInput): string | undefined {
  if (credential.provider === AiCredentialProvider.GOOGLE) return GOOGLE_OPENAI_COMPAT_BASE_URL;
  if (credential.provider === AiCredentialProvider.CUSTOM) return credential.baseUrl ?? undefined;
  if (credential.provider === AiCredentialProvider.OPENROUTER) return OPENROUTER_BASE_URL;
  return undefined;
}
