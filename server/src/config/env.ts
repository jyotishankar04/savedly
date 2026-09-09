import dotenv from "dotenv";
import z from "zod";
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    MAILHOG_URL: z.string().min(1, "MAILHOG_URL is required"),
    // SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
    // SMTP_PORT: z.coerce.number().default(1025),
    // SMTP_USERNAME: z.string().optional(),
    // SMTP_PASSWORD: z.string().optional(),
    // SMTP_FROM_ADDRESS: z.string().email().optional(),
    FRONTEND_URL: z.string().url().min(1, "FRONTEND_URL is required"),
    SERVER_URL: z.string().url().min(1, "SERVER_URL is required"),
    // Custom URL scheme the mobile app registers (app.json's "scheme") — the
    // OAuth callback redirects here instead of FRONTEND_URL when the request
    // came from mobile, since a native app has no cookie jar to receive
    // Set-Cookie the way a same-origin web app does.
    MOBILE_SCHEME: z.string().default("memora"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
    GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
    GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),

    R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
    R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
    R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
    R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL"),

    // AI ingestion (docs/AI_REQUIREMENTS.md): Groq for the LLM steps, OpenAI
    // for embeddings only (matches the schema's hardcoded vector(1536)).
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

    // Vector storage backend — local/dev uses the pgvector columns already
    // on `memories`/`memory_chunks`; production points at Upstash Vector
    // instead, so vector search load never competes with the primary DB.
    VECTOR_STORE_PROVIDER: z.enum(["pgvector", "upstash"]).default("pgvector"),
    UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
    UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),

    // Langfuse (self-hosted, see docker-compose.yml's langfuse-* services) —
    // traces every node/LLM call in the ingestion pipeline. Optional: if
    // unset, tracing is just skipped rather than failing the pipeline.
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().default("http://localhost:3001"),
  })
  .refine((data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  })
  .refine(
    (data) =>
      data.VECTOR_STORE_PROVIDER !== "upstash" ||
      (data.UPSTASH_VECTOR_REST_URL && data.UPSTASH_VECTOR_REST_TOKEN),
    {
      message: "UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required when VECTOR_STORE_PROVIDER=upstash",
      path: ["UPSTASH_VECTOR_REST_TOKEN"],
    }
  );

export const env = envSchema.parse(process.env);
