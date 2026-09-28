import { z } from "zod";

// Everything a self-hosted admin can configure from Admin -> Configuration ->
// Infrastructure, one section per external service. Each field says which
// env var(s) can set it (env always wins over the settings table) and whether
// it's a secret (encrypted at rest, never sent back to the client).
//
// The client renders the settings page straight from this metadata (see
// instance-settings.service.ts's describeSections), so adding a field here is
// the whole change — no form to keep in sync.

export type FieldKind = "text" | "password" | "number" | "boolean" | "select";
export type FieldValue = string | number | boolean;

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  secret?: boolean;
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  /** Only show this field when another field in the section has one of these values. */
  showWhen?: { field: string; equals: readonly FieldValue[] };
  /** Reads the explicit env var(s) for this field — undefined when none is set. */
  fromEnv?: () => FieldValue | undefined;
}

export interface SectionDef {
  id: SectionId;
  title: string;
  description: string;
  fields: FieldDef[];
  /** Used when neither env nor the settings table sets a field. */
  defaults: Record<string, FieldValue | undefined>;
  /**
   * Hosted production / local dev only, layered over `defaults`: the values
   * that kept this service working before self-hosting existed (e.g. email
   * defaulting to the dev Mailhog on localhost:1025).
   */
  hostedDefaults?: Record<string, FieldValue | undefined>;
  /** Validates a merged section before it's saved. */
  schema: z.ZodType;
  /** Whether a Test connection button makes sense for this section. */
  testable: boolean;
}

export type SectionId = "storage" | "vector" | "email" | "embeddings" | "googleAuth" | "githubAuth";

const env = (name: string) => {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
};
const envBool = (name: string) => {
  const value = env(name);
  return value === undefined ? undefined : value === "true";
};
const envNum = (name: string) => {
  const value = env(name);
  return value === undefined ? undefined : Number(value);
};
const firstEnv = (...names: string[]) => names.map(env).find((v) => v !== undefined);

const r2Endpoint = () => {
  const accountId = env("R2_ACCOUNT_ID");
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;
};

export const SECTIONS: SectionDef[] = [
  {
    id: "storage",
    title: "File storage",
    description:
      "Where uploaded files (images, PDFs, voice memos) are kept. Local disk works out of the box; switch to any S3-compatible store such as Cloudflare R2, AWS S3 or MinIO.",
    testable: true,
    fields: [
      {
        name: "driver",
        label: "Storage",
        kind: "select",
        options: [
          { value: "local", label: "Local disk" },
          { value: "s3", label: "S3-compatible (R2, S3, MinIO)" },
        ],
        fromEnv: () => env("STORAGE_DRIVER") ?? (env("R2_ACCOUNT_ID") ? "s3" : undefined),
      },
      {
        name: "endpoint",
        label: "Endpoint URL",
        kind: "text",
        placeholder: "https://<account>.r2.cloudflarestorage.com",
        help: "Leave empty for AWS S3.",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => env("S3_ENDPOINT") ?? r2Endpoint(),
      },
      {
        name: "region",
        label: "Region",
        kind: "text",
        placeholder: "auto",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => env("S3_REGION"),
      },
      {
        name: "bucket",
        label: "Bucket",
        kind: "text",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => firstEnv("S3_BUCKET", "R2_BUCKET_NAME"),
      },
      {
        name: "accessKeyId",
        label: "Access key ID",
        kind: "text",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => firstEnv("S3_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID"),
      },
      {
        name: "secretAccessKey",
        label: "Secret access key",
        kind: "password",
        secret: true,
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => firstEnv("S3_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY"),
      },
      {
        name: "publicUrl",
        label: "Public URL",
        kind: "text",
        placeholder: "https://files.example.com",
        help: "The public base URL files are served from (e.g. an R2 custom domain).",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => firstEnv("S3_PUBLIC_URL", "R2_PUBLIC_URL"),
      },
      {
        name: "forcePathStyle",
        label: "Path-style URLs",
        kind: "boolean",
        help: "Turn on for MinIO and most self-hosted S3 servers.",
        showWhen: { field: "driver", equals: ["s3"] },
        fromEnv: () => envBool("S3_FORCE_PATH_STYLE"),
      },
    ],
    defaults: { driver: "local", region: "auto", forcePathStyle: false },
    schema: z.discriminatedUnion("driver", [
      z.object({ driver: z.literal("local") }).passthrough(),
      z
        .object({
          driver: z.literal("s3"),
          endpoint: z.string().url().optional(),
          region: z.string().min(1),
          bucket: z.string().min(1, "Bucket is required"),
          accessKeyId: z.string().min(1, "Access key ID is required"),
          secretAccessKey: z.string().min(1, "Secret access key is required"),
          publicUrl: z.string().url("Public URL must be a valid URL"),
          forcePathStyle: z.boolean(),
        })
        .passthrough(),
    ]),
  },
  {
    id: "vector",
    title: "Vector store",
    description:
      "Where the embeddings behind search and Ask live. The built-in Postgres (pgvector) needs no setup. Switching stores doesn't move existing vectors — memories saved before the switch need re-processing to be found by meaning.",
    testable: true,
    fields: [
      {
        name: "provider",
        label: "Store",
        kind: "select",
        options: [
          { value: "pgvector", label: "Built-in Postgres (pgvector)" },
          { value: "upstash", label: "Upstash Vector" },
        ],
        fromEnv: () => env("VECTOR_STORE_PROVIDER"),
      },
      {
        name: "upstashUrl",
        label: "Upstash REST URL",
        kind: "text",
        showWhen: { field: "provider", equals: ["upstash"] },
        fromEnv: () => env("UPSTASH_VECTOR_REST_URL"),
      },
      {
        name: "upstashToken",
        label: "Upstash REST token",
        kind: "password",
        secret: true,
        showWhen: { field: "provider", equals: ["upstash"] },
        fromEnv: () => env("UPSTASH_VECTOR_REST_TOKEN"),
      },
    ],
    defaults: { provider: "pgvector" },
    schema: z.discriminatedUnion("provider", [
      z.object({ provider: z.literal("pgvector") }).passthrough(),
      z
        .object({
          provider: z.literal("upstash"),
          upstashUrl: z.string().url("Upstash REST URL must be a valid URL"),
          upstashToken: z.string().min(1, "Upstash REST token is required"),
        })
        .passthrough(),
    ]),
  },
  {
    id: "email",
    title: "Email",
    description:
      "Outgoing email (welcome messages, share invites, digests). Off by default — everything else works without it.",
    testable: true,
    fields: [
      { name: "enabled", label: "Send email", kind: "boolean", fromEnv: () => (env("SMTP_HOST") ? true : undefined) },
      { name: "host", label: "SMTP host", kind: "text", showWhen: { field: "enabled", equals: [true] }, fromEnv: () => env("SMTP_HOST") },
      { name: "port", label: "SMTP port", kind: "number", showWhen: { field: "enabled", equals: [true] }, fromEnv: () => envNum("SMTP_PORT") },
      {
        name: "secure",
        label: "Use TLS",
        kind: "boolean",
        help: "On for port 465; off for 587 (STARTTLS) or 25.",
        showWhen: { field: "enabled", equals: [true] },
        fromEnv: () => envBool("SMTP_SECURE"),
      },
      { name: "username", label: "Username", kind: "text", showWhen: { field: "enabled", equals: [true] }, fromEnv: () => env("SMTP_USERNAME") },
      {
        name: "password",
        label: "Password",
        kind: "password",
        secret: true,
        showWhen: { field: "enabled", equals: [true] },
        fromEnv: () => env("SMTP_PASSWORD"),
      },
      {
        name: "fromAddress",
        label: "From address",
        kind: "text",
        placeholder: "noreply@example.com",
        showWhen: { field: "enabled", equals: [true] },
        fromEnv: () => env("SMTP_FROM_ADDRESS"),
      },
      { name: "fromName", label: "From name", kind: "text", showWhen: { field: "enabled", equals: [true] }, fromEnv: () => env("SMTP_FROM_NAME") },
    ],
    defaults: { enabled: false, port: 587, secure: false, fromName: "SaveForLatter", fromAddress: "noreply@saveforlatter.local" },
    hostedDefaults: { enabled: true, host: "localhost", port: 1025 },
    schema: z
      .object({
        enabled: z.boolean(),
        host: z.string().optional(),
        port: z.number().int().positive().optional(),
        fromAddress: z.string().optional(),
      })
      .passthrough()
      .superRefine((v, ctx) => {
        if (!v.enabled) return;
        if (!v.host) ctx.addIssue({ code: "custom", path: ["host"], message: "SMTP host is required" });
        if (!v.port) ctx.addIssue({ code: "custom", path: ["port"], message: "SMTP port is required" });
        if (!v.fromAddress || !z.string().email().safeParse(v.fromAddress).success) {
          ctx.addIssue({ code: "custom", path: ["fromAddress"], message: "From address must be an email" });
        }
      }),
  },
  {
    id: "embeddings",
    title: "Embeddings",
    description:
      "One key for the whole instance so search by meaning works for everyone, even before they add their own AI key. Anyone who adds their own embeddings key in Settings -> AI uses theirs instead.",
    testable: true,
    fields: [
      {
        name: "provider",
        label: "Provider",
        kind: "select",
        options: [
          { value: "openai", label: "OpenAI" },
          { value: "google", label: "Google Gemini" },
          { value: "custom", label: "OpenAI-compatible (custom URL)" },
        ],
        fromEnv: () => env("EMBEDDINGS_PROVIDER"),
      },
      { name: "apiKey", label: "API key", kind: "password", secret: true, fromEnv: () => env("EMBEDDINGS_API_KEY") },
      { name: "model", label: "Model", kind: "text", placeholder: "text-embedding-3-small", fromEnv: () => env("EMBEDDINGS_MODEL") },
      {
        name: "baseUrl",
        label: "Base URL",
        kind: "text",
        showWhen: { field: "provider", equals: ["custom"] },
        fromEnv: () => env("EMBEDDINGS_BASE_URL"),
      },
    ],
    defaults: { provider: "openai", model: "text-embedding-3-small" },
    schema: z
      .object({
        provider: z.enum(["openai", "google", "custom"]),
        apiKey: z.string().optional(),
        model: z.string().min(1),
        baseUrl: z.string().url().optional(),
      })
      .passthrough()
      .refine((v) => v.provider !== "custom" || !v.apiKey || !!v.baseUrl, {
        message: "Base URL is required for a custom provider",
        path: ["baseUrl"],
      }),
  },
  {
    id: "googleAuth",
    title: "Sign in with Google",
    description: "Optional. Create an OAuth client in Google Cloud Console with the redirect URI shown below.",
    testable: false,
    fields: [
      { name: "clientId", label: "Client ID", kind: "text", fromEnv: () => env("GOOGLE_CLIENT_ID") },
      { name: "clientSecret", label: "Client secret", kind: "password", secret: true, fromEnv: () => env("GOOGLE_CLIENT_SECRET") },
    ],
    defaults: {},
    schema: z.object({ clientId: z.string().optional(), clientSecret: z.string().optional() }).passthrough(),
  },
  {
    id: "githubAuth",
    title: "Sign in with GitHub",
    description: "Optional. Create an OAuth app in GitHub Developer settings with the callback URL shown below.",
    testable: false,
    fields: [
      { name: "clientId", label: "Client ID", kind: "text", fromEnv: () => env("GITHUB_CLIENT_ID") },
      { name: "clientSecret", label: "Client secret", kind: "password", secret: true, fromEnv: () => env("GITHUB_CLIENT_SECRET") },
    ],
    defaults: {},
    schema: z.object({ clientId: z.string().optional(), clientSecret: z.string().optional() }).passthrough(),
  },
];

export function getSectionDef(id: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.id === id);
}
