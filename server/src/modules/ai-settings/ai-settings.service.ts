import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { aiCredentials, userAiRoleAssignments } from "../../db/schema";
import { AiCredentialProvider, AiRole } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { env } from "../../config/env";
import { decryptToken, encryptToken } from "../../shared/crypto/token-cipher";
import { listProviderModels, type ProviderModelList } from "./model-catalog";
import { testRoleCredential, type TestCredentialResult } from "../ai/ai.providers";
import type { AssignRoleInput, CreateCredentialInput, TestConnectionInput, UpdateCredentialInput } from "./ai-settings.schema";

/** Which roles the platform covers by default, without any user-configured key — right now just embeddings (see .env.example). Surfaced so the settings UI can show "provided by default" instead of "not set". */
export function getPlatformDefaults(): Record<AiRole, boolean> {
  return {
    [AiRole.FAST]: false,
    [AiRole.REASONING]: false,
    [AiRole.VISION]: false,
    [AiRole.EMBEDDINGS]: Boolean(env.EMBEDDINGS_API_KEY),
  };
}

export interface CredentialSummary {
  id: string;
  provider: AiCredentialProvider;
  label: string;
  baseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleAssignmentSummary {
  role: AiRole;
  credentialId: string;
  credentialLabel: string;
  provider: AiCredentialProvider;
  model: string;
  verifiedAt: Date | null;
}

// Groq and Anthropic never offer an embeddings API (see ai.providers.ts's
// buildEmbeddings) — checked up front here so a bad embeddings assignment
// fails with a clear, specific message instead of a generic test-call error.
const EMBEDDINGS_INCOMPATIBLE_PROVIDERS = new Set<AiCredentialProvider>([AiCredentialProvider.GROQ, AiCredentialProvider.ANTHROPIC]);

function toCredentialSummary(row: typeof aiCredentials.$inferSelect): CredentialSummary {
  return { id: row.id, provider: row.provider, label: row.label, baseUrl: row.baseUrl, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function listCredentials(userId: string): Promise<CredentialSummary[]> {
  const rows = await db.select().from(aiCredentials).where(eq(aiCredentials.userId, userId)).orderBy(aiCredentials.createdAt);
  return rows.map(toCredentialSummary);
}

export async function createCredential(userId: string, input: CreateCredentialInput): Promise<CredentialSummary> {
  const [row] = await db
    .insert(aiCredentials)
    .values({
      userId,
      provider: input.provider,
      label: input.label,
      encryptedApiKey: encryptToken(input.apiKey),
      baseUrl: input.provider === AiCredentialProvider.CUSTOM ? (input.baseUrl ?? null) : null,
    })
    .returning();
  return toCredentialSummary(row);
}

async function requireOwnedCredential(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(aiCredentials)
    .where(and(eq(aiCredentials.id, id), eq(aiCredentials.userId, userId)));
  if (!row) throw new AppError("AI credential not found", 404, "NOT_FOUND");
  return row;
}

export async function updateCredential(userId: string, id: string, input: UpdateCredentialInput): Promise<CredentialSummary> {
  await requireOwnedCredential(userId, id);
  const [row] = await db
    .update(aiCredentials)
    .set({
      label: input.label,
      encryptedApiKey: input.apiKey ? encryptToken(input.apiKey) : undefined,
      baseUrl: input.baseUrl,
    })
    .where(eq(aiCredentials.id, id))
    .returning();
  return toCredentialSummary(row);
}

/** Cascades to any role assignment using this credential (FK ON DELETE CASCADE) — that role simply becomes unconfigured again. */
export async function deleteCredential(userId: string, id: string): Promise<void> {
  await requireOwnedCredential(userId, id);
  await db.delete(aiCredentials).where(eq(aiCredentials.id, id));
}

export async function listRoleAssignments(userId: string): Promise<RoleAssignmentSummary[]> {
  return db
    .select({
      role: userAiRoleAssignments.role,
      credentialId: userAiRoleAssignments.credentialId,
      model: userAiRoleAssignments.model,
      verifiedAt: userAiRoleAssignments.verifiedAt,
      credentialLabel: aiCredentials.label,
      provider: aiCredentials.provider,
    })
    .from(userAiRoleAssignments)
    .innerJoin(aiCredentials, eq(userAiRoleAssignments.credentialId, aiCredentials.id))
    .where(eq(userAiRoleAssignments.userId, userId));
}

/**
 * Always runs a live test call against the provider before saving — a role
 * assignment that can't actually be reached (bad key, wrong model name, a
 * non-1536-dim embedding model) is worse than no assignment at all, since
 * every ingestion/RAG call site treats "configured" as "safe to call
 * without checking again." Upserts on (userId, role) — reassigning a role
 * just replaces the previous credential/model pair.
 */
export async function assignRole(userId: string, role: AiRole, input: AssignRoleInput): Promise<RoleAssignmentSummary> {
  const credential = await requireOwnedCredential(userId, input.credentialId);

  if (role === AiRole.EMBEDDINGS && EMBEDDINGS_INCOMPATIBLE_PROVIDERS.has(credential.provider)) {
    throw new AppError(`${credential.provider} has no embeddings API — pick a different credential for this role`, 422, "PROVIDER_NO_EMBEDDINGS");
  }

  const apiKey = decryptToken(credential.encryptedApiKey);
  const result = await testRoleCredential({ provider: credential.provider, apiKey, baseUrl: credential.baseUrl, model: input.model }, role);
  if (!result.ok) {
    throw new AppError(result.error ?? "Connection test failed", 422, "AI_TEST_FAILED");
  }

  const [row] = await db
    .insert(userAiRoleAssignments)
    .values({ userId, role, credentialId: input.credentialId, model: input.model, verifiedAt: new Date() })
    .onConflictDoUpdate({
      target: [userAiRoleAssignments.userId, userAiRoleAssignments.role],
      set: { credentialId: input.credentialId, model: input.model, verifiedAt: new Date() },
    })
    .returning();

  return {
    role: row.role,
    credentialId: row.credentialId,
    credentialLabel: credential.label,
    provider: credential.provider,
    model: row.model,
    verifiedAt: row.verifiedAt,
  };
}

export async function unassignRole(userId: string, role: AiRole): Promise<void> {
  await db.delete(userAiRoleAssignments).where(and(eq(userAiRoleAssignments.userId, userId), eq(userAiRoleAssignments.role, role)));
}

/** Tests raw, not-yet-saved credentials straight from the settings form — nothing here is persisted. */
export async function testConnection(input: TestConnectionInput): Promise<TestCredentialResult> {
  if (input.role === AiRole.EMBEDDINGS && EMBEDDINGS_INCOMPATIBLE_PROVIDERS.has(input.provider)) {
    return { ok: false, error: `${input.provider} has no embeddings API` };
  }
  return testRoleCredential({ provider: input.provider, apiKey: input.apiKey, baseUrl: input.baseUrl, model: input.model }, input.role);
}

/** Every model this saved key can use, straight from its provider (see model-catalog.ts). */
export async function listCredentialModels(userId: string, id: string): Promise<ProviderModelList> {
  const credential = await requireOwnedCredential(userId, id);
  return listProviderModels(
    credential.provider,
    decryptToken(credential.encryptedApiKey),
    credential.baseUrl,
    `${credential.id}:${credential.updatedAt.getTime()}`,
  );
}
