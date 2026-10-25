import dotenv from "dotenv";
import z from "zod";
import { loadSelfHostSecrets } from "./self-host-secrets";
dotenv.config();
loadSelfHostSecrets();

// z.coerce.boolean() would read the string "false" as true.
const envFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Self-hosted: external services get working defaults, billing is off, plan limits are lifted.
    SELF_HOSTED: envFlag,
    // Self-hosted installs check GitHub about twice a day for a newer release; false disables it.
    // UPDATE_CHECK_URL points at a fork's releases.
    UPDATE_CHECK: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    UPDATE_CHECK_URL: z.string().url().optional(),
    // Items processed at once; lower it if the AI provider rate-limits.
    INGESTION_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
    // Daily cap on the public help box (instance AI key), across everyone; 0 turns it off.
    HELP_ASSISTANT_DAILY_LIMIT: z.coerce.number().int().min(0).default(500),
    // Where a self-hosted install keeps generated secrets and local uploads (Docker volumes).
    SECRETS_DIR: z.string().default("./.secrets"),
    FILES_DIR: z.string().default("./data/files"),
    // Proxy hops to trust for req.ip; add one per reverse proxy.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    // SMTP defaults target the local Mailhog (port 1025, no auth); set env for a real provider.
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USERNAME: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM_ADDRESS: z.string().email().default("noreply@savedly.local"),
    SMTP_FROM_NAME: z.string().default("Savedly"),
    FRONTEND_URL: z.string().url().min(1, "FRONTEND_URL is required"),
    SERVER_URL: z.string().url().min(1, "SERVER_URL is required"),
    // Custom URL scheme for the native-app OAuth callback.
    MOBILE_SCHEME: z.string().default("memora"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // Signs the share-link password cookie; separate from JWT_ACCESS_SECRET so a share token can't
    // pass authenticate().
    SHARE_TOKEN_SECRET: z.string().min(32, "SHARE_TOKEN_SECRET must be at least 32 characters"),

    // Signs the vault-unlock cookie; a separate secret for the same reason as SHARE_TOKEN_SECRET.
    VAULT_TOKEN_SECRET: z.string().min(32, "VAULT_TOKEN_SECRET must be at least 32 characters"),

    // Required in hosted production (see superRefine below); optional when self-hosted.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    // Cloudflare R2, hosted file storage: required unless self-hosted (local disk by default).
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL").optional(),

    // Vector backend: pgvector locally; Upstash or Pinecone in production so search load stays off
    // the primary DB.
    VECTOR_STORE_PROVIDER: z.enum(["pgvector", "upstash", "pinecone"]).default("pgvector"),
    UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
    UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
    // Pinecone: the API key and the index's own host, both from the Pinecone console.
    PINECONE_API_KEY: z.string().optional(),
    PINECONE_INDEX_HOST: z.string().optional(),

    // The one role the platform pays for, so semantic search works from sign-up. A user's own key
    // takes priority.
    EMBEDDINGS_PROVIDER: z.enum(["openai", "google", "custom"]).default("openai"),
    EMBEDDINGS_API_KEY: z.string().optional(),
    EMBEDDINGS_MODEL: z.string().default("text-embedding-3-small"),
    EMBEDDINGS_BASE_URL: z.string().url().optional(),

    // Platform keys for included AI (see canUseIncludedAi); Admin -> Infrastructure can edit, and a
    // value here overrides and locks the field.
    PLATFORM_AI_FAST_PROVIDER: z.enum(["openai", "anthropic", "groq", "google", "openrouter", "custom"]).optional(),
    PLATFORM_AI_FAST_API_KEY: z.string().optional(),
    PLATFORM_AI_FAST_MODEL: z.string().optional(),
    PLATFORM_AI_REASONING_PROVIDER: z.enum(["openai", "anthropic", "groq", "google", "openrouter", "custom"]).optional(),
    PLATFORM_AI_REASONING_API_KEY: z.string().optional(),
    PLATFORM_AI_REASONING_MODEL: z.string().optional(),
    PLATFORM_AI_VISION_PROVIDER: z.enum(["openai", "anthropic", "groq", "google", "openrouter", "custom"]).optional(),
    PLATFORM_AI_VISION_API_KEY: z.string().optional(),
    PLATFORM_AI_VISION_MODEL: z.string().optional(),
    // Only for a "custom" (OpenAI-compatible) provider above.
    PLATFORM_AI_BASE_URL: z.string().url().optional(),

    // Hosted only. Without a provider /billing returns 503 BILLING_NOT_CONFIGURED.
    BILLING_PROVIDER: z.enum(["dodo"]).optional(),
    DODO_PAYMENTS_API_KEY: z.string().optional(),
    // The webhook signing secret from the Dodo dashboard (starts "whsec_").
    DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
    DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
    // Dodo product id per paid plan, as JSON keyed by plan key.
    DODO_PRODUCT_IDS: z
      .string()
      .optional()
      .transform((raw, ctx) => {
        if (!raw) return {} as Record<string, string>;
        try {
          return z.record(z.string(), z.string()).parse(JSON.parse(raw));
        } catch {
          ctx.addIssue({ code: "custom", message: "DODO_PRODUCT_IDS must be a JSON object of plan key -> product id" });
          return z.NEVER;
        }
      }),

    // Error tracking (config/sentry.ts). Unset = nothing is reported.
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    // The build's version, sent to Sentry as the release. Empty means none.
    APP_VERSION: z.string().optional(),
    // Where the migration files are, for the self-hosted container's bootstrap.
    MIGRATIONS_DIR: z.string().default("./drizzle"),
    // Langfuse traces the ingestion pipeline's LLM calls; skipped when unset.
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().default("http://localhost:3001"),

    // AES-256-GCM key for stored OAuth tokens (32 bytes, base64: `openssl rand -base64 32`). Unset:
    // calendar routes return 503.
    TOKEN_ENCRYPTION_KEY: z.string().optional(),
    // Signs the calendar-connect OAuth state. Its own secret so the token can't be read as any other kind.
    CALENDAR_STATE_SECRET: z.string().min(32, "CALENDAR_STATE_SECRET must be at least 32 characters"),
  })
  .superRefine((data, ctx) => {
    // Hosted production needs OAuth and object storage; local dev falls back to email sign-in and local disk.
    if (data.SELF_HOSTED || data.NODE_ENV !== "production") return;
    const requiredInProduction = [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "R2_PUBLIC_URL",
    ] as const;
    for (const key of requiredInProduction) {
      if (!data[key]) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required (set SELF_HOSTED=true to run without it)` });
      }
    }
  })
  .refine((data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  })
  .refine(
    (data) =>
      data.SHARE_TOKEN_SECRET !== data.JWT_ACCESS_SECRET &&
      data.SHARE_TOKEN_SECRET !== data.JWT_REFRESH_SECRET,
    {
      message: "SHARE_TOKEN_SECRET must differ from both JWT secrets",
      path: ["SHARE_TOKEN_SECRET"],
    }
  )
  .refine(
    (data) =>
      data.VAULT_TOKEN_SECRET !== data.JWT_ACCESS_SECRET &&
      data.VAULT_TOKEN_SECRET !== data.JWT_REFRESH_SECRET &&
      data.VAULT_TOKEN_SECRET !== data.SHARE_TOKEN_SECRET,
    {
      message: "VAULT_TOKEN_SECRET must differ from the other token secrets",
      path: ["VAULT_TOKEN_SECRET"],
    }
  )
  .refine(
    (data) =>
      data.CALENDAR_STATE_SECRET !== data.JWT_ACCESS_SECRET &&
      data.CALENDAR_STATE_SECRET !== data.JWT_REFRESH_SECRET &&
      data.CALENDAR_STATE_SECRET !== data.SHARE_TOKEN_SECRET &&
      data.CALENDAR_STATE_SECRET !== data.VAULT_TOKEN_SECRET,
    {
      message: "CALENDAR_STATE_SECRET must differ from the other token secrets",
      path: ["CALENDAR_STATE_SECRET"],
    }
  )
  .refine(
    (data) =>
      data.VECTOR_STORE_PROVIDER !== "upstash" ||
      (data.UPSTASH_VECTOR_REST_URL && data.UPSTASH_VECTOR_REST_TOKEN),
    {
      message: "UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required when VECTOR_STORE_PROVIDER=upstash",
      path: ["UPSTASH_VECTOR_REST_TOKEN"],
    }
  )
  .refine(
    (data) => data.VECTOR_STORE_PROVIDER !== "pinecone" || (data.PINECONE_API_KEY && data.PINECONE_INDEX_HOST),
    {
      message: "PINECONE_API_KEY and PINECONE_INDEX_HOST are required when VECTOR_STORE_PROVIDER=pinecone",
      path: ["PINECONE_API_KEY"],
    }
  )
  .refine(
    (data) => !data.EMBEDDINGS_API_KEY || data.EMBEDDINGS_PROVIDER !== "custom" || !!data.EMBEDDINGS_BASE_URL,
    {
      message: "EMBEDDINGS_BASE_URL is required when EMBEDDINGS_PROVIDER=custom",
      path: ["EMBEDDINGS_BASE_URL"],
    }
  );

// An empty value in .env (as .env.example ships) means "not set"; otherwise optional settings fail
// validation.
const definedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));

export const env = envSchema.parse(definedEnv);
