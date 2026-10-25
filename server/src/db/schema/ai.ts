import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { memories } from "./library";
import { aiCredentialProviderEnum, aiRoleEnum } from "./pg-enums";

// Ask Savedly threads: listing and naming only; messages live in LangGraph's checkpointer tables.
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

// Per-call token and cost record; FKs are "set null" so cost history survives deletions.
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

// Bring-your-own AI keys, AES-256-GCM encrypted at rest. `baseUrl` is required only for provider "custom".
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

// One row per user per role. `verifiedAt` is set after a successful test call; no row means
// unconfigured (step skipped).
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
