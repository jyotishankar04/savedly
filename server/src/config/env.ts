import dotenv from "dotenv";
import z from "zod";
import { loadSelfHostSecrets } from "./self-host-secrets";
dotenv.config();
loadSelfHostSecrets();

// "true"/"false" strings from the environment — z.coerce.boolean() would read
// the string "false" as true.
const envFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Self-hosted install (docker-compose.yml at the repo root). Every
    // external service becomes optional with a working default (local disk,
    // pgvector, no email), the admin can configure the rest from Admin ->
    // Configuration -> Infrastructure, billing is off and every plan limit
    // is lifted. Hosted production leaves this false and is configured only
    // through env.
    SELF_HOSTED: envFlag,
    // Where a self-hosted install keeps its generated secrets and, with the
    // local storage driver, uploaded files. Both are Docker volumes in
    // docker-compose.yml.
    SECRETS_DIR: z.string().default("./.secrets"),
    FILES_DIR: z.string().default("./data/files"),
    // Express "trust proxy" hops, so req.ip (rate limits, session records) is
    // the visitor's address rather than the proxy's. The self-hosted client
    // proxies /api/v1 to this server, so docker-compose.yml sets 1; add one
    // more for each reverse proxy (Caddy, nginx) in front of it.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    // SMTP transport for outgoing email — Mailhog in dev (docker-compose's
    // `mailhog` service: SMTP on 1025, web UI at http://localhost:8025).
    // Defaults target that local Mailhog with no auth, so a plain `.env`
    // with none of these set still works; swap in a real provider in
    // production by setting env, no code change needed.
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USERNAME: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM_ADDRESS: z.string().email().default("noreply@saveforlatter.local"),
    SMTP_FROM_NAME: z.string().default("SaveForLatter"),
    FRONTEND_URL: z.string().url().min(1, "FRONTEND_URL is required"),
    SERVER_URL: z.string().url().min(1, "SERVER_URL is required"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // Signs the "I entered the password for this shared link" proof cookie.
    // Deliberately NOT JWT_ACCESS_SECRET: a share token is minted for
    // anonymous visitors, so if the two shared a secret, a forged share
    // token carrying a `sub` claim would sail straight through
    // authenticate(). Separate secrets make that class of confusion
    // impossible rather than merely unlikely.
    SHARE_TOKEN_SECRET: z.string().min(32, "SHARE_TOKEN_SECRET must be at least 32 characters"),

    // Signs the vault-unlock proof cookie — same token-confusion reasoning
    // as SHARE_TOKEN_SECRET, kept as its own secret rather than reused.
    VAULT_TOKEN_SECRET: z.string().min(32, "VAULT_TOKEN_SECRET must be at least 32 characters"),

    // Required in hosted production (see the superRefine below); optional
    // when SELF_HOSTED, where email + password sign-in works on its own and
    // OAuth can be added later from the admin Infrastructure settings.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    // Cloudflare R2 — hosted production's file storage. Same rule as OAuth:
    // required unless SELF_HOSTED, where uploads default to local disk
    // (FILES_DIR) and any S3-compatible store can be set up in settings.
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL").optional(),

    // Vector storage backend — local/dev uses the pgvector columns already
    // on `memories`/`memory_chunks`; production points at Upstash Vector
    // instead, so vector search load never competes with the primary DB.
    VECTOR_STORE_PROVIDER: z.enum(["pgvector", "upstash", "pinecone"]).default("pgvector"),
    UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
    UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
    // Pinecone: the API key and the index's own host, both from the Pinecone console.
    PINECONE_API_KEY: z.string().optional(),
    PINECONE_INDEX_HOST: z.string().optional(),

    // Every AI role is bring-your-own-key EXCEPT this one: embeddings are
    // cheap enough (fractions of a cent per memory) that the platform pays
    // for them directly, so semantic search works the moment someone signs
    // up rather than staying dark until they've configured a key. Optional
    // — same degrade-gracefully pattern as every other secret here: if
    // unset, getEmbeddings() just has nothing to fall back to, and a user's
    // own configured embeddings credential (Settings -> AI) always takes
    // priority over this when they have one. See ai.providers.ts.
    EMBEDDINGS_PROVIDER: z.enum(["openai", "google", "custom"]).default("openai"),
    EMBEDDINGS_API_KEY: z.string().optional(),
    EMBEDDINGS_MODEL: z.string().default("text-embedding-3-small"),
    EMBEDDINGS_BASE_URL: z.string().url().optional(),

    // Included AI: the platform's own chat/vision keys, used for anyone on a
    // plan with an included-AI allowance (Free's small monthly taste, AI
    // included) who hasn't added a key of their own. Quota-checked per plan —
    // see plans.service.ts canUseIncludedAi. Normally set in Admin ->
    // Infrastructure -> Included AI (editable on hosted production too, so
    // models can change without a redeploy); a value here overrides and
    // locks that field. All optional: with none set, every role stays
    // bring-your-own-key. On a self-hosted install, everyone gets AI with no limits.
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

    // Billing (hosted only; ignored when SELF_HOSTED). Optional: with no
    // provider configured, /billing returns 503 BILLING_NOT_CONFIGURED and
    // the rest of the app is unaffected. Dodo Payments is a merchant of
    // record (it handles sales tax/VAT/GST) and supports cards worldwide plus
    // UPI (including UPI Autopay for subscriptions) in India.
    BILLING_PROVIDER: z.enum(["dodo"]).optional(),
    DODO_PAYMENTS_API_KEY: z.string().optional(),
    // The webhook signing secret from the Dodo dashboard (starts "whsec_").
    DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
    DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
    // Which Dodo product each paid plan sells, as JSON keyed by plan key:
    // {"lite-monthly":"pdt_...","lite-yearly":"pdt_...","ai-monthly":"pdt_...","ai-yearly":"pdt_..."}
    // The price charged is the product's price in Dodo — keep the plan's
    // display price in Admin -> Plans & Limits the same.
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

    // Langfuse (self-hosted, see docker-compose.yml's langfuse-* services) —
    // traces every node/LLM call in the ingestion pipeline. Optional: if
    // unset, tracing is just skipped rather than failing the pipeline.
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().default("http://localhost:3001"),

    // Calendar OAuth connect (separate from the login-only Google scope
    // above). Google reuses GOOGLE_CLIENT_ID/SECRET via incremental
    // authorization — the human operator must enable the Calendar API and
    // approve the calendar.events scope on the existing GCP OAuth client;
    // no new Google credentials needed.
    // AES-256-GCM key for encrypting stored OAuth tokens — 32 raw bytes,
    // base64-encoded. Generate with:
    // node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    // Optional so the app still boots without it; every calendar route
    // degrades to 503 CALENDAR_NOT_CONFIGURED when unset.
    TOKEN_ENCRYPTION_KEY: z.string().optional(),
    // Signs the calendar-connect OAuth "state" param, carrying the
    // initiating user's id across the redirect (the callback route has no
    // session/cookie of its own — see modules/integrations/calendar/calendar.controller.ts).
    // Same reasoning as SHARE_TOKEN_SECRET/VAULT_TOKEN_SECRET: a dedicated
    // secret, not reused, so a forged calendar-state token can never be
    // read as any other kind.
    CALENDAR_STATE_SECRET: z.string().min(32, "CALENDAR_STATE_SECRET must be at least 32 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.SELF_HOSTED) return;
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

export const env = envSchema.parse(process.env);
