import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { memories } from "./library";
import { aiCredentialProviderEnum, aiRoleEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 19. Threads Table (Ask Savedly chat threads — listing/naming only;
//     message content lives in LangGraph's own Postgres checkpointer tables,
//     keyed by this table's id as thread_id)
// -----------------------------------------------------------------------------
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_threads_user_id").on(table.userId)]
);

// -----------------------------------------------------------------------------
// 22. AI Usage Logs Table (per-call token/cost record for the admin AI-usage
//     dashboard. FKs use "set null" rather than this schema's usual cascade —
//     aggregate cost history should survive a user/thread/memory deletion.)
// -----------------------------------------------------------------------------
export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    requestType: varchar("request_type", { length: 100 }).notNull(), // e.g. "ingestion:classify_intent", "rag:agent", "embedding:document"
    provider: varchar("provider", { length: 50 }).notNull(), // "groq" | "openai" — distinct from the OAuth providerEnum
    model: varchar("model", { length: 100 }).notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    costEstimateUsd: real("cost_estimate_usd"),
    threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "set null" }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ai_usage_logs_user_created").on(table.userId, table.createdAt),
    index("idx_ai_usage_logs_created_at").on(table.createdAt),
    index("idx_ai_usage_logs_request_type_created").on(table.requestType, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 39. AI Credentials Table (bring-your-own-key — every user supplies and pays
//     for their own AI provider account; the platform never holds/spends an
//     AI API key of its own. `label` is user-facing ("My OpenAI key"); the
//     key itself is AES-256-GCM-encrypted at rest via shared/crypto/token-
//     cipher.ts, same as calendar_connections' OAuth tokens. `baseUrl` is
//     only meaningful (and required, enforced in ai-settings.service.ts) for
//     provider "custom" — any other provider's endpoint is hardcoded in
//     ai.providers.ts.
// -----------------------------------------------------------------------------
export const aiCredentials = pgTable(
  "ai_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: aiCredentialProviderEnum("provider").notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    baseUrl: text("base_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_ai_credentials_user_id").on(table.userId)]
);

// -----------------------------------------------------------------------------
// 40. User AI Role Assignments Table (one row per user per role — which
//     saved credential + which model string handles that role's calls.
//     `verifiedAt` is set only after a real test call against the provider
//     succeeds — see ai-settings.service.ts's testCredential/assignRole —
//     so the settings UI can distinguish "saved" from "confirmed working."
//     A role with no row here is simply unconfigured: every ai.providers.ts
//     resolver treats that as "skip this AI step," never as an error to
//     surface mid-pipeline (see ingestion nodes' `if (!model) return {...}`
//     guards).
// -----------------------------------------------------------------------------
export const userAiRoleAssignments = pgTable(
  "user_ai_role_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: aiRoleEnum("role").notNull(),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => aiCredentials.id, { onDelete: "cascade" }),
    model: varchar("model", { length: 150 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_user_ai_role_assignments_user_role").on(table.userId, table.role),
    index("idx_user_ai_role_assignments_user_id").on(table.userId),
    index("idx_user_ai_role_assignments_credential_id").on(table.credentialId),
  ]
);
