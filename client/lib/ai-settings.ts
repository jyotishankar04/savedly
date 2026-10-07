import { apiFetch } from "@/lib/auth";

export type AiProvider = "openai" | "anthropic" | "groq" | "google" | "openrouter" | "custom";
export type AiRole = "fast" | "reasoning" | "vision" | "embeddings";

export interface AiCredential {
  id: string;
  provider: AiProvider;
  label: string;
  baseUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiRoleAssignment {
  role: AiRole;
  credentialId: string;
  credentialLabel: string;
  provider: AiProvider;
  model: string;
  verifiedAt: string | null;
}

/** One model from the live catalog (OpenRouter), or from a saved key's own provider. Prices are USD per 1M tokens. */
export interface CatalogModel {
  id: string;
  name: string;
  vendor: string;
  kind: "chat" | "embedding";
  inputPrice: number | null;
  outputPrice: number | null;
  contextLength: number | null;
  vision: boolean | null;
  tools: boolean | null;
}

export interface TestConnectionResult {
  ok: boolean;
  error?: string;
  dimensions?: number;
}

export async function listCredentials(): Promise<AiCredential[]> {
  return apiFetch<AiCredential[]>("/ai-settings/credentials");
}

export async function createCredential(input: { provider: AiProvider; label: string; apiKey: string; baseUrl?: string }): Promise<AiCredential> {
  return apiFetch<AiCredential>("/ai-settings/credentials", { method: "POST", body: input });
}

export async function updateCredential(id: string, input: { label?: string; apiKey?: string; baseUrl?: string }): Promise<AiCredential> {
  return apiFetch<AiCredential>(`/ai-settings/credentials/${id}`, { method: "PATCH", body: input });
}

export async function deleteCredential(id: string): Promise<void> {
  await apiFetch(`/ai-settings/credentials/${id}`, { method: "DELETE" });
}

/** Public: every model OpenRouter lists, with live prices. Nothing is stored — the server re-reads it every few minutes. */
export async function getModelCatalog(): Promise<{ models: CatalogModel[]; fetchedAt: string }> {
  return apiFetch<{ models: CatalogModel[]; fetchedAt: string }>("/ai-settings/models");
}

/** Every model a saved key can use, asked of its provider live. */
export async function listCredentialModels(id: string): Promise<{ models: CatalogModel[]; error: string | null }> {
  return apiFetch<{ models: CatalogModel[]; error: string | null }>(`/ai-settings/credentials/${id}/models`);
}

/** Whether a model can fill a role, using what the catalog knows (unknown capabilities are allowed through). */
export function modelFitsRole(model: CatalogModel, role: AiRole): boolean {
  if (role === "embeddings") return model.kind === "embedding";
  if (model.kind !== "chat") return false;
  if (role === "vision") return model.vision !== false;
  if (role === "reasoning") return model.tools !== false;
  return true;
}

/** "$0.10 / $0.40" per 1M tokens, or "Price varies". */
export function formatModelPrice(model: CatalogModel): string {
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
  if (model.inputPrice === null) return "Price varies";
  if (model.inputPrice === 0 && (model.outputPrice ?? 0) === 0) return "Free";
  return model.outputPrice === null ? `${fmt(model.inputPrice)} in` : `${fmt(model.inputPrice)} in / ${fmt(model.outputPrice)} out`;
}

export async function listRoleAssignments(): Promise<AiRoleAssignment[]> {
  return apiFetch<AiRoleAssignment[]>("/ai-settings/roles");
}

export async function assignRole(role: AiRole, input: { credentialId: string; model: string }): Promise<AiRoleAssignment> {
  return apiFetch<AiRoleAssignment>(`/ai-settings/roles/${role}`, { method: "PUT", body: input });
}

export async function unassignRole(role: AiRole): Promise<void> {
  await apiFetch(`/ai-settings/roles/${role}`, { method: "DELETE" });
}

export async function testConnection(input: { provider: AiProvider; apiKey: string; baseUrl?: string; model: string; role: AiRole }): Promise<TestConnectionResult> {
  return apiFetch<TestConnectionResult>("/ai-settings/test", { method: "POST", body: input });
}

/** Which roles the platform covers without any configured key — right now just embeddings, when the server has EMBEDDINGS_API_KEY set. */
export async function getPlatformDefaults(): Promise<Record<AiRole, boolean>> {
  return apiFetch<Record<AiRole, boolean>>("/ai-settings/platform-defaults");
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
  google: "Google Gemini",
  openrouter: "OpenRouter (every model)",
  custom: "Custom (OpenAI-compatible)",
};

export const ROLE_LABEL: Record<AiRole, string> = {
  fast: "Fast",
  reasoning: "Reasoning",
  vision: "Vision",
  embeddings: "Embeddings",
};

export const ROLE_DESCRIPTION: Record<AiRole, string> = {
  fast: "Quick extraction, tagging, and classification — runs on every memory you save.",
  reasoning: "The Ask Savedly chat assistant and anything needing real judgment.",
  vision: "Reading and describing images you save (OCR + visual description).",
  embeddings: "Powers semantic search and the Ask assistant's memory lookup. Must be exactly 1536-dimensional — see the note below.",
};


export const EMBEDDINGS_INCOMPATIBLE_PROVIDERS: AiProvider[] = ["groq", "anthropic"];

export type AiSource = "own" | "included" | "none";

export interface AiAllowance {
  /** null = unlimited */
  limit: number | null;
  used: number;
}

/** Where this account's AI comes from — see server ai-settings.service.ts getAiStatus. */
export interface AiStatus {
  /** managed: the plan supplies all AI (AI included), nothing to set up. own-key: the user brings keys. */
  mode: "managed" | "own-key";
  roles: Record<"fast" | "reasoning" | "vision", AiSource>;
  /** saves: AI processing, one per saved item (reading images included). */
  included: { saves: AiAllowance; questions: AiAllowance } | null;
  /** The server has its own AI keys, so included AI can actually run. */
  includedReady: boolean;
  askAvailable: boolean;
  askBlockedReason: "no-ai" | "included-used-up" | null;
  savedKeysIgnored: number;
}

export const AI_STATUS_QUERY_KEY = ["ai-settings", "status"] as const;

export async function getAiStatus(): Promise<AiStatus> {
  return apiFetch<AiStatus>("/ai-settings/status");
}
