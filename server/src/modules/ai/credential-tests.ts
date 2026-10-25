import { HumanMessage } from "@langchain/core/messages";
import { AiRole } from "../../db/enums";
import { EMBEDDING_DIMENSIONS } from "../../db/pgvector-type";
import { type ProviderCredentialInput } from "./credentials";
import { buildChatModel, buildEmbeddings } from "./models";

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
