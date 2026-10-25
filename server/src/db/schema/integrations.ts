import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { memories } from "./library";
import { calendarProviderEnum } from "./pg-enums";

// Calendar write-access tokens, separate from login identities. One connection per (user,
// provider); tokens are AES-256-GCM ciphertext.
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"), // null if the provider didn't return one
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }).notNull(),
    scope: text("scope").notNull(),
    // The connected account's own email, for "Connected as jane@gmail.com"
    // UI copy without ever having to decrypt a token just to display it.
    providerAccountEmail: text("provider_account_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_calendar_connections_user_provider").on(table.userId, table.provider),
    index("idx_calendar_connections_user_id").on(table.userId),
  ]
);

// One per user: the GitHub account whose starred repositories are added to
// their library (modules/integrations/github). The token only identifies the
// account and reads the stars it has made public.
export const githubConnections = pgTable(
  "github_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    githubUserId: varchar("github_user_id", { length: 64 }).notNull(),
    // For "Connected as @octocat" without decrypting anything.
    login: varchar("login", { length: 100 }).notNull(),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    scope: text("scope").notNull().default(""),
    // The newest star already dealt with: a sync only looks at stars after it.
    lastStarredAt: timestamp("last_starred_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    // Repositories this connection has added to the library, in total.
    importedCount: integer("imported_count").notNull().default(0),
    // Why the last sync stopped short, in words the user can act on. Null when it went fine.
    lastError: text("last_error"),
    // GitHub refused the token (access revoked): syncing stops until they connect again.
    needsReconnect: boolean("needs_reconnect").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("uq_github_connections_user").on(table.userId)],
);

// One row per memory and provider event created through the API, so a memory isn't pushed twice and
// its remote event can be found later.
export const calendarEventLinks = pgTable(
  "calendar_event_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: calendarProviderEnum("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    externalHtmlLink: text("external_html_link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_calendar_event_links_memory_provider").on(table.memoryId, table.provider),
    index("idx_calendar_event_links_user_id").on(table.userId),
  ]
);
