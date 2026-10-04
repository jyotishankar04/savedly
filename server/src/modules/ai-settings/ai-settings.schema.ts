import { z } from "zod";
import { AiCredentialProvider, AiRole } from "../../db/enums";

const providerSchema = z.enum([
  AiCredentialProvider.OPENAI,
  AiCredentialProvider.ANTHROPIC,
  AiCredentialProvider.GROQ,
  AiCredentialProvider.GOOGLE,
  AiCredentialProvider.CUSTOM,
  AiCredentialProvider.OPENROUTER,
]);

const roleSchema = z.enum([AiRole.FAST, AiRole.REASONING, AiRole.VISION, AiRole.EMBEDDINGS]);

export const createCredentialSchema = z
  .object({
    provider: providerSchema,
    label: z.string().min(1).max(100),
    apiKey: z.string().min(1).max(2000),
    baseUrl: z.string().url().max(500).optional(),
  })
  .refine((data) => data.provider !== AiCredentialProvider.CUSTOM || !!data.baseUrl, {
    message: "baseUrl is required for a custom (OpenAI-compatible) provider",
    path: ["baseUrl"],
  });

export const updateCredentialSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).max(2000).optional(),
  baseUrl: z.string().url().max(500).optional(),
});

export const credentialIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const roleParamsSchema = z.object({
  role: roleSchema,
});

export const assignRoleSchema = z.object({
  credentialId: z.string().uuid(),
  model: z.string().min(1).max(150),
});

// Used by the settings UI's "test connection" step before a credential is
// even saved — provider/apiKey/baseUrl/model come straight from the form,
// never persisted plaintext (see ai-settings.service.ts's testConnection).
export const testConnectionSchema = z
  .object({
    provider: providerSchema,
    apiKey: z.string().min(1).max(2000),
    baseUrl: z.string().url().max(500).optional(),
    model: z.string().min(1).max(150),
    role: roleSchema,
  })
  .refine((data) => data.provider !== AiCredentialProvider.CUSTOM || !!data.baseUrl, {
    message: "baseUrl is required for a custom (OpenAI-compatible) provider",
    path: ["baseUrl"],
  });

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
