import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { AccentColor, OrganizeMode, SettingsTheme, UserStatus } from "../enums";
import { accentColorEnum, organizeModeEnum, providerEnum, settingsThemeEnum, userStatusEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 1. Users Table
// -----------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    status: userStatusEnum("status").notNull().default(UserStatus.ACTIVE),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // The vault PIN, scrypt-hashed (shared/crypto/scrypt-password.ts) — same
    // KDF as share-link passwords. Null until the user sets one up. Embedded
    // as the `pv` claim in the vault-unlock token, so changing the PIN
    // invalidates every unlock proof already issued, the same trick used for
    // share-link passwords.
    // Email + password sign-in (self-hosted installs), scrypt-hashed with
    // shared/crypto/scrypt-password.ts like the vault PIN. Null for accounts
    // that only ever signed in through Google/GitHub.
    passwordHash: text("password_hash"),
    vaultPinHash: text("vault_pin_hash"),
    vaultPinUpdatedAt: timestamp("vault_pin_updated_at", { withTimezone: true }),
    // When a soft account-deletion was requested (status flips to DELETED at
    // the same time). Null while status !== DELETED. Drives the grace-period
    // window before account-deletion.job.ts hard-deletes the row — see
    // modules/account/. Logging back in before the cutoff (auth.service.ts's
    // findOrCreateUser) clears this and flips status back to ACTIVE,
    // cancelling the pending wipe.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_users_deleted_at").on(table.deletedAt).where(sql`${table.status} = 'deleted'`)]
);

// -----------------------------------------------------------------------------
// 2. OAuth Auth Identities Table
// -----------------------------------------------------------------------------
export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    providerData: jsonb("provider_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_auth_identities_provider_provider_id").on(
      table.provider,
      table.providerId
    ),
    index("idx_auth_identities_user_id").on(table.userId),
  ]
);

// -----------------------------------------------------------------------------
// 3. Dynamic Roles Table (Supports Free, Pro, Admin, Custom)
// -----------------------------------------------------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. "user", "admin" — access level, NOT billing tier (see `plans`)
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false), // Protected core roles
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// -----------------------------------------------------------------------------
// 4. Dynamic Permissions Table
// -----------------------------------------------------------------------------
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. "bookmarks:export", "ai:summarize", "billing:manage"
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g. "ai", "bookmarks", "billing", "admin"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// -----------------------------------------------------------------------------
// 5. Role Permissions (Dynamic Role <-> Permission mapping)
// -----------------------------------------------------------------------------
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_role_permissions_role_perm").on(
      table.roleId,
      table.permissionId
    ),
    index("idx_role_permissions_role_id").on(table.roleId),
  ]
);

// -----------------------------------------------------------------------------
// 6. User Roles (Dynamic User <-> Role assignment)
// -----------------------------------------------------------------------------
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_user_roles_user_role").on(table.userId, table.roleId),
    index("idx_user_roles_user_id").on(table.userId),
  ]
);

// -----------------------------------------------------------------------------
// 7. Refresh Tokens Table
// -----------------------------------------------------------------------------
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_refresh_tokens_user_id").on(table.userId)]
);

// -----------------------------------------------------------------------------
// 8. Sessions Table
// -----------------------------------------------------------------------------
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenId: uuid("refresh_token_id").references(
      () => refreshTokens.id,
      { onDelete: "cascade" }
    ),
    deviceId: varchar("device_id", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)]
);

// -----------------------------------------------------------------------------
// 9. Devices Table
// -----------------------------------------------------------------------------
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
    deviceName: varchar("device_name", { length: 255 }),
    platform: varchar("platform", { length: 100 }),
    browser: varchar("browser", { length: 100 }),
    deviceType: varchar("device_type", { length: 100 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_devices_user_fingerprint").on(
      table.userId,
      table.deviceFingerprint
    ),
    index("idx_devices_user_id").on(table.userId),
  ]
);

// -----------------------------------------------------------------------------
// 10. User Onboarding Table (answers collected by the /onboard questionnaire)
// -----------------------------------------------------------------------------
export const userOnboarding = pgTable("user_onboarding", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  contentTypes: jsonb("content_types").$type<string[]>().notNull().default([]),
  organizeMode: organizeModeEnum("organize_mode")
    .notNull()
    .default(OrganizeMode.AUTO),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// -----------------------------------------------------------------------------
// 11. User Settings Table (ai / capture / notifications / appearance toggles)
// -----------------------------------------------------------------------------
// No `default_collection_id` column yet — the `collections` table doesn't
// exist in this schema yet (memory-capture layer, not built). The settings
// API reports it as always null until that lands.
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  aiAutoOrganization: boolean("ai_auto_organization").notNull().default(true),
  aiSummaries: boolean("ai_summaries").notNull().default(true),
  aiRelatedMemories: boolean("ai_related_memories").notNull().default(true),
  aiSemanticSearch: boolean("ai_semantic_search").notNull().default(true),
  aiAskSavedly: boolean("ai_ask_memora").notNull().default(true),
  captureExtractContent: boolean("capture_extract_content").notNull().default(true),
  captureGenerateTitle: boolean("capture_generate_title").notNull().default(true),
  captureGenerateSummary: boolean("capture_generate_summary").notNull().default(true),
  captureSuggestTags: boolean("capture_suggest_tags").notNull().default(true),
  // The Sunday email of saves waiting to be read (modules/memory/weekly-digest.job.ts).
  notifyWeeklySummary: boolean("notify_weekly_summary").notNull().default(true),
  // When it last went out, so it's sent once a week however many servers sweep.
  weeklyDigestSentAt: timestamp("weekly_digest_sent_at", { withTimezone: true }),
  notifyForgottenMemories: boolean("notify_forgotten_memories").notNull().default(true),
  // Emails for reminders set with "Remind me" (the in-app notification always comes).
  notifyReminderEmails: boolean("notify_reminder_emails").notNull().default(true),
  notifyProductUpdates: boolean("notify_product_updates").notNull().default(false),
  // Set when the user opts out of announcement emails (the link in the email,
  // or Settings > Notifications). Null means they get them. Account emails,
  // such as a share invitation, are sent either way.
  emailUnsubscribedAt: timestamp("email_unsubscribed_at", { withTimezone: true }),
  theme: settingsThemeEnum("theme").notNull().default(SettingsTheme.SYSTEM),
  accentColor: accentColorEnum("accent_color").notNull().default(AccentColor.BLUE),
  // IANA name ("Asia/Kolkata"), set from the browser. Event detection reads
  // "3 pm" in this zone; null = unknown, treated as UTC.
  timezone: varchar("timezone", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
