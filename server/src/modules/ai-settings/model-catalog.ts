import { AiCredentialProvider } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { OPENROUTER_BASE_URL } from "../ai/ai.providers";

// OpenRouter publishes a free, keyless catalog of every model it routes to
// (hundreds of models across dozens of providers) with prices, context
// length, input modalities and supported parameters. It's the one source that
// covers every provider, so prices and capabilities come from it instead of a
// hardcoded list that goes stale. A user's own key is still asked for the
// exact model IDs it can use (see listProviderModels).

export interface CatalogModel {
  /** The model ID to enter for this provider. */
  id: string;
  name: string;
  /** Who makes the model, e.g. "openai", "anthropic" (OpenRouter's ID prefix). */
  vendor: string;
  kind: "chat" | "embedding";
  /** USD per 1M tokens; null when unknown or priced per request. */
  inputPrice: number | null;
  outputPrice: number | null;
  contextLength: number | null;
  /** Accepts image input. null when unknown (no catalog match). */
  vision: boolean | null;
  /** Supports tool calling (needed by the Ask assistant). null when unknown. */
  tools: boolean | null;
}

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number | null;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
}

// Nothing is stored — the catalog is re-read from OpenRouter at most every
// 10 minutes, so new models and price changes show up almost immediately.
const CATALOG_TTL_MS = 10 * 60 * 1000;
const PROVIDER_LIST_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

/** OpenRouter prices are USD per token as strings; negative means "varies". */
function perMillion(value: string | undefined): number | null {
  const n = Number(value);
  if (value === undefined || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1_000_000 * 10_000) / 10_000;
}

function fromOpenRouter(m: OpenRouterModel, kind: CatalogModel["kind"]): CatalogModel {
  return {
    id: m.id,
    name: m.name ?? m.id,
    vendor: m.id.split("/")[0],
    kind,
    inputPrice: perMillion(m.pricing?.prompt),
    outputPrice: kind === "embedding" ? null : perMillion(m.pricing?.completion),
    contextLength: m.context_length ?? null,
    vision: kind === "chat" ? (m.architecture?.input_modalities?.includes("image") ?? false) : false,
    tools: kind === "chat" ? (m.supported_parameters?.includes("tools") ?? false) : false,
  };
}

let catalogCache: { models: CatalogModel[]; fetchedAt: Date } | null = null;
let catalogInFlight: Promise<{ models: CatalogModel[]; fetchedAt: Date }> | null = null;

async function loadCatalog(): Promise<{ models: CatalogModel[]; fetchedAt: Date }> {
  const [chat, embeddings] = await Promise.all([
    fetchJson(`${OPENROUTER_BASE_URL}/models`),
    fetchJson(`${OPENROUTER_BASE_URL}/embeddings/models`),
  ]);
  const chatList = ((chat as { data?: OpenRouterModel[] }).data ?? []).map((m) => fromOpenRouter(m, "chat"));
  const embeddingList = ((embeddings as { data?: OpenRouterModel[] }).data ?? []).map((m) => fromOpenRouter(m, "embedding"));
  if (chatList.length === 0) throw new Error("OpenRouter returned an empty model catalog");
  return { models: [...chatList, ...embeddingList], fetchedAt: new Date() };
}

/**
 * Held in memory for 10 minutes; concurrent callers share one fetch. On a
 * failed refresh the last good copy is served rather than an error.
 */
export async function getModelCatalog(): Promise<{ models: CatalogModel[]; fetchedAt: Date }> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt.getTime() < CATALOG_TTL_MS) return catalogCache;
  if (!catalogInFlight) {
    catalogInFlight = loadCatalog()
      .then((fresh) => (catalogCache = fresh))
      .catch((err) => {
        if (catalogCache) {
          logger.warn({ err }, "[model-catalog] refresh failed, serving the previous catalog");
          return catalogCache;
        }
        throw err;
      })
      .finally(() => {
        catalogInFlight = null;
      });
  }
  return catalogInFlight;
}

// --- A user's own key: the exact model IDs their provider offers -----------

/** OpenRouter IDs look like "anthropic/claude-haiku-4.5"; providers use "claude-haiku-4-5-20251001". */
function matchKey(id: string): string {
  return id
    .toLowerCase()
    .replace(/^models\//, "")
    .replace(/^[^/]+\//, "")
    .replace(/\./g, "-")
    .replace(/-\d{8}$/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

// Not usable for any role here (audio, image generation, moderation, ...).
const NON_TEXT_MODEL = /(whisper|tts|dall-e|moderation|realtime|transcribe|audio|image|sora|computer-use|search|guard|imagen|veo|lyria|aqa)/i;

interface ProviderEndpoint {
  url: string;
  headers: Record<string, string>;
}

function providerModelsEndpoint(provider: AiCredentialProvider, apiKey: string, baseUrl: string | null): ProviderEndpoint | null {
  const bearer = { Authorization: `Bearer ${apiKey}` };
  switch (provider) {
    case AiCredentialProvider.OPENAI:
      return { url: "https://api.openai.com/v1/models", headers: bearer };
    case AiCredentialProvider.GROQ:
      return { url: "https://api.groq.com/openai/v1/models", headers: bearer };
    case AiCredentialProvider.GOOGLE:
      return { url: "https://generativelanguage.googleapis.com/v1beta/openai/models", headers: bearer };
    case AiCredentialProvider.ANTHROPIC:
      return { url: "https://api.anthropic.com/v1/models?limit=1000", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } };
    case AiCredentialProvider.CUSTOM:
      return baseUrl ? { url: `${baseUrl.replace(/\/+$/, "")}/models`, headers: bearer } : null;
    case AiCredentialProvider.OPENROUTER:
      return null; // served straight from the catalog
  }
}

const providerListCache = new Map<string, { models: CatalogModel[]; expiresAt: number }>();

export interface ProviderModelList {
  models: CatalogModel[];
  /** Set when the provider couldn't be reached; the UI still accepts a typed model name. */
  error: string | null;
}

/**
 * Every model the user's own key can use, from that provider's own list
 * endpoint, enriched with price/capabilities from the catalog where the IDs
 * match. For OpenRouter the catalog itself is the list. `cacheKey` should
 * change when the key changes (e.g. include the credential's updatedAt).
 */
export async function listProviderModels(
  provider: AiCredentialProvider,
  apiKey: string,
  baseUrl: string | null,
  cacheKey: string,
): Promise<ProviderModelList> {
  const cached = providerListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { models: cached.models, error: null };

  let catalog: CatalogModel[] = [];
  try {
    catalog = (await getModelCatalog()).models;
  } catch (err) {
    logger.warn({ err }, "[model-catalog] catalog unavailable, listing provider models without prices");
  }

  if (provider === AiCredentialProvider.OPENROUTER) {
    if (catalog.length === 0) return { models: [], error: "Couldn't load OpenRouter's model list. You can still type a model ID." };
    providerListCache.set(cacheKey, { models: catalog, expiresAt: Date.now() + PROVIDER_LIST_TTL_MS });
    return { models: catalog, error: null };
  }

  const endpoint = providerModelsEndpoint(provider, apiKey, baseUrl);
  if (!endpoint) return { models: [], error: "This key has no base URL to list models from." };

  let raw: { id: string; display_name?: string }[];
  try {
    const body = (await fetchJson(endpoint.url, endpoint.headers)) as { data?: { id: string; display_name?: string }[] };
    raw = body.data ?? [];
  } catch (err) {
    logger.warn({ err: (err as Error).message, provider }, "[model-catalog] provider model list failed");
    return { models: [], error: "Couldn't load models from this provider. Check the key, or type a model name." };
  }

  // Exact OpenRouter ID first (Groq and many custom endpoints reuse them),
  // then a normalized match on the model name.
  const byId = new Map(catalog.map((m) => [m.id.toLowerCase(), m]));
  const byKey = new Map<string, CatalogModel>();
  for (const m of catalog) if (!byKey.has(matchKey(m.id))) byKey.set(matchKey(m.id), m);

  const models: CatalogModel[] = [];
  for (const item of raw) {
    const id = item.id.replace(/^models\//, "");
    if (NON_TEXT_MODEL.test(id)) continue;
    const match = byId.get(id.toLowerCase()) ?? byKey.get(matchKey(id));
    const isEmbedding = match ? match.kind === "embedding" : /embed/i.test(id);
    models.push({
      id,
      name: item.display_name ?? match?.name ?? id,
      vendor: match?.vendor ?? provider,
      kind: isEmbedding ? "embedding" : "chat",
      inputPrice: match?.inputPrice ?? null,
      outputPrice: match?.outputPrice ?? null,
      contextLength: match?.contextLength ?? null,
      vision: match ? match.vision : null,
      tools: match ? match.tools : null,
    });
  }
  models.sort((a, b) => a.id.localeCompare(b.id));

  providerListCache.set(cacheKey, { models, expiresAt: Date.now() + PROVIDER_LIST_TTL_MS });
  return { models, error: null };
}
