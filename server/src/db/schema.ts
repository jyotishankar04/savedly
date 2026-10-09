import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { defineRelations, sql } from "drizzle-orm";
import { vector, tsvector, EMBEDDING_DIMENSIONS } from "./pgvector-type";
import {
  AccentColor,
  AiCredentialProvider,
  AiRole,
  AnnouncementDisplayMode,
  WhatsNewKind,
  AnnouncementType,
  CalendarProvider,
  CollectionSource,
  EmailCategory,
  EmailStatus,
  EmailTemplateKey,
  ImportItemStatus,
  ImportSourceType,
  MemoryStatus,
  MemoryType,
  NotificationType,
  OrganizeMode,
  PlanAssignmentSource,
  PlanAssignmentStatus,
  PlanBillingInterval,
  PlanLimitType,
  Provider,
  ReportStatus,
  ReportType,
  SettingsTheme,
  ShareAccessRequestStatus,
  ShareGrantSource,
  ShareGrantStatus,
  ShareLinkAccess,
  ShareResourceType,
  UserStatus,
} from "./enums";

export const userStatusEnum = pgEnum("user_status", [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.BANNED,
  UserStatus.SUSPENDED,
  UserStatus.DELETED,
]);

export const providerEnum = pgEnum("provider", [
  Provider.GOOGLE,
  Provider.GITHUB,
]);

export const settingsThemeEnum = pgEnum("settings_theme", [
  SettingsTheme.SYSTEM,
  SettingsTheme.LIGHT,
  SettingsTheme.DARK,
]);

export const accentColorEnum = pgEnum("accent_color", [
  AccentColor.BLUE,
  AccentColor.PURPLE,
  AccentColor.GREEN,
  AccentColor.ORANGE,
]);

export const organizeModeEnum = pgEnum("organize_mode", [
  OrganizeMode.AUTO,
  OrganizeMode.MANUAL,
]);

export const memoryTypeEnum = pgEnum("memory_type", [
  MemoryType.WEB,
  MemoryType.VIDEO,
  MemoryType.NOTE,
  MemoryType.IMAGE,
  MemoryType.DOCUMENT,
  MemoryType.VOICE,
]);

export const memoryStatusEnum = pgEnum("memory_status", [
  MemoryStatus.PROCESSING,
  MemoryStatus.READY,
  MemoryStatus.PARTIAL,
  MemoryStatus.FAILED,
]);

export const announcementTypeEnum = pgEnum("announcement_type", [
  AnnouncementType.COUNTDOWN,
  AnnouncementType.ANNOUNCEMENT,
  AnnouncementType.UPDATE,
]);

export const announcementDisplayModeEnum = pgEnum("announcement_display_mode", [
  AnnouncementDisplayMode.BANNER,
  AnnouncementDisplayMode.FULL_PAGE,
]);

export const whatsNewKindEnum = pgEnum("whats_new_kind", [WhatsNewKind.NEW, WhatsNewKind.IMPROVED, WhatsNewKind.UPCOMING]);

export const reportTypeEnum = pgEnum("report_type", [ReportType.BUG, ReportType.FEATURE]);

export const reportStatusEnum = pgEnum("report_status", [
  ReportStatus.OPEN,
  ReportStatus.REVIEWING,
  ReportStatus.RESOLVED,
  ReportStatus.DECLINED,
]);

export const aiCredentialProviderEnum = pgEnum("ai_credential_provider", [
  AiCredentialProvider.OPENAI,
  AiCredentialProvider.ANTHROPIC,
  AiCredentialProvider.GROQ,
  AiCredentialProvider.GOOGLE,
  AiCredentialProvider.CUSTOM,
  AiCredentialProvider.OPENROUTER,
]);

export const aiRoleEnum = pgEnum("ai_role", [AiRole.FAST, AiRole.REASONING, AiRole.VISION, AiRole.EMBEDDINGS]);

export const collectionSourceEnum = pgEnum("collection_source", [
  CollectionSource.USER,
  CollectionSource.SYSTEM,
]);

export const planLimitTypeEnum = pgEnum("plan_limit_type", [
  PlanLimitType.MEMORY_COUNT,
  PlanLimitType.AI_MONTHLY_QUERIES,
  PlanLimitType.AI_MONTHLY_VISION_QUERIES,
  PlanLimitType.STORAGE_MB,
  PlanLimitType.COLLECTION_COUNT,
  PlanLimitType.PUBLIC_SHARE_COUNT,
  PlanLimitType.AI_MONTHLY_SAVES,
  PlanLimitType.MAX_FILE_MB,
  PlanLimitType.IMPORT_MONTHLY_COUNT,
]);

// SEMI_ANNUAL was missing here even though it's a real PlanBillingInterval
// value (added in 464160f) and already exists on the live Postgres enum —
// this TS-side definition just never caught up, which is what made
// seedDefaultPlans's `billingInterval: seed.billingInterval` fail to
// typecheck (Drizzle infers the column's TS type from this list, not from
// the enum import). Also visible client-side (client/lib/plans.ts needed
// the same value added to its own local union to match).
export const planBillingIntervalEnum = pgEnum("plan_billing_interval", [
  PlanBillingInterval.MONTHLY,
  PlanBillingInterval.SEMI_ANNUAL,
  PlanBillingInterval.YEARLY,
  PlanBillingInterval.ONE_TIME,
]);

export const shareResourceTypeEnum = pgEnum("share_resource_type", [
  ShareResourceType.COLLECTION,
  ShareResourceType.MEMORY,
]);

export const shareLinkAccessEnum = pgEnum("share_link_access", [
  ShareLinkAccess.DISABLED,
  ShareLinkAccess.PUBLIC,
  ShareLinkAccess.REQUEST,
  ShareLinkAccess.PASSWORD,
]);

export const shareGrantStatusEnum = pgEnum("share_grant_status", [
  ShareGrantStatus.PENDING,
  ShareGrantStatus.ACTIVE,
  ShareGrantStatus.REVOKED,
]);

export const shareGrantSourceEnum = pgEnum("share_grant_source", [
  ShareGrantSource.DIRECT_INVITE,
  ShareGrantSource.ACCESS_REQUEST,
]);

export const shareAccessRequestStatusEnum = pgEnum("share_access_request_status", [
  ShareAccessRequestStatus.PENDING,
  ShareAccessRequestStatus.APPROVED,
  ShareAccessRequestStatus.DENIED,
  ShareAccessRequestStatus.CANCELLED,
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  NotificationType.SHARE_INVITE_RECEIVED,
  NotificationType.SHARE_ACCESS_REQUESTED,
  NotificationType.SHARE_ACCESS_APPROVED,
  NotificationType.SHARE_ACCESS_DENIED,
  NotificationType.SHARE_REVOKED,
  NotificationType.EVENT_DETECTED,
]);

export const planAssignmentStatusEnum = pgEnum("plan_assignment_status", [
  PlanAssignmentStatus.ACTIVE,
  PlanAssignmentStatus.EXPIRED,
  PlanAssignmentStatus.CANCELLED,
  PlanAssignmentStatus.SUPERSEDED,
]);

// Trimmed to the two sources that still exist — REFERRAL_REWARD/
// COUPON_REDEMPTION/PAYMENT were how a paid-tier assignment got granted;
// nothing writes those anymore now that there's no billing.
export const planAssignmentSourceEnum = pgEnum("plan_assignment_source", [
  PlanAssignmentSource.ADMIN_MANUAL,
  PlanAssignmentSource.SIGNUP_DEFAULT,
  PlanAssignmentSource.SUBSCRIPTION,
]);

export const emailCategoryEnum = pgEnum("email_category", [
  EmailCategory.TRANSACTIONAL,
  EmailCategory.MARKETING,
  EmailCategory.ALERT,
  EmailCategory.ANNOUNCEMENT,
  EmailCategory.CUSTOM,
]);

export const emailTemplateKeyEnum = pgEnum("email_template_key", [
  EmailTemplateKey.WELCOME,
  EmailTemplateKey.USER_STATUS_CHANGED,
  EmailTemplateKey.SHARE_INVITE,
  EmailTemplateKey.SHARE_ACCESS_REQUESTED,
  EmailTemplateKey.SHARE_ACCESS_APPROVED,
  EmailTemplateKey.SHARE_ACCESS_DENIED,
  EmailTemplateKey.ADMIN_CUSTOM,
  EmailTemplateKey.EVENT_DETECTED,
]);

export const emailStatusEnum = pgEnum("email_status", [
  EmailStatus.QUEUED,
  EmailStatus.SENDING,
  EmailStatus.SENT,
  EmailStatus.FAILED,
]);

export const importSourceTypeEnum = pgEnum("import_source_type", [
  ImportSourceType.BOOKMARKS_HTML,
  ImportSourceType.URL_LIST,
]);

export const importItemStatusEnum = pgEnum("import_item_status", [
  ImportItemStatus.CREATED,
  ImportItemStatus.SKIPPED_DUPLICATE,
  ImportItemStatus.FAILED,
]);

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
// 2b. Calendar Connections Table
// -----------------------------------------------------------------------------
export const calendarProviderEnum = pgEnum("calendar_provider", [
  CalendarProvider.GOOGLE,
  CalendarProvider.MICROSOFT,
]);

// Calendar write-access tokens, distinct from authIdentities (login).
// One live connection per (user, provider) — reconnecting overwrites rather
// than accumulating rows. Tokens are AES-256-GCM ciphertext (see
// shared/crypto/token-cipher.ts), never plaintext at rest.
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

// One row per memory×provider event actually created via the API — keeps a
// memory from being double-pushed to the same calendar, and lets a future
// "remove event" action find the remote id. Distinct from
// calendarConnections (auth) and memories.eventAt (the date itself).
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
  notifyWeeklySummary: boolean("notify_weekly_summary").notNull().default(true),
  notifyForgottenMemories: boolean("notify_forgotten_memories").notNull().default(true),
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

// -----------------------------------------------------------------------------
// 12. Collections Table
// -----------------------------------------------------------------------------
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    icon: varchar("icon", { length: 50 }).notNull().default("folder-outline"),
    description: text("description"),
    // "system" collections (onboarding defaults, AI-suggested groupings) stay
    // hidden in the UI behind a toggle and never count against the
    // collection_count plan limit. Conversion is one-way (system -> user
    // only, via collection.service.ts's convertToUser) — convertedFromSystemAt
    // being non-null doubles as "already converted," so there's no separate
    // boolean to drift out of sync.
    source: collectionSourceEnum("source").notNull().default(CollectionSource.USER),
    convertedFromSystemAt: timestamp("converted_from_system_at", { withTimezone: true }),
    // Hides the whole collection (and cascades isVaulted onto every memory
    // in it — see vault.service.ts) from every normal read path until the
    // vault PIN is unlocked.
    isVaulted: boolean("is_vaulted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_collections_user_id").on(table.userId),
    index("idx_collections_user_source").on(table.userId, table.source),
  ]
);

// -----------------------------------------------------------------------------
// 13. Memories Table
// -----------------------------------------------------------------------------
export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: memoryTypeEnum("type").notNull(),
    // Always exists once POST /memories returns — this describes enrichment
    // progress, never whether the memory itself succeeded or failed to save.
    status: memoryStatusEnum("status").notNull().default(MemoryStatus.PROCESSING),
    title: text("title").notNull().default("Untitled"),
    url: text("url"),
    // Lowercased host, tracking params/fragment/trailing-slash stripped —
    // for non-blocking duplicate detection (see normalize-url.ts). Null for
    // non-link memories.
    normalizedUrl: text("normalized_url"),
    content: text("content"),
    description: text("description"),
    source: varchar("source", { length: 100 }),
    faviconUrl: text("favicon_url"),
    previewImageUrl: text("preview_image_url"),
    keywords: text("keywords").array(),
    // URL capture & preview system (docs/URL_CAPTURE_AND_PREVIEW.md) — all
    // null until ingestion runs, or forever null for non-link memories.
    previewStatus: text("preview_status"),
    previewSource: text("preview_source"),
    platform: text("platform"),
    resourceType: text("resource_type"),
    canonicalUrl: text("canonical_url"),
    // Diagnostics only — never shown to the user directly, see UI_COPY in
    // the plan ("Preview unavailable", not "Cloudflare blocked our crawler").
    fetchStatus: text("fetch_status"),
    captureMethod: text("capture_method"),
    // Raw browser-observed metadata from the Chrome extension's
    // POST /:id/browser-capture, consumed by the ingestion pipeline's merge
    // step and kept for re-merging on a later /refresh-preview.
    browserCapture: jsonb("browser_capture"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    inTrash: boolean("in_trash").notNull().default(false),
    // When this became true. Null while inTrash is false (never trashed, or
    // restored). Drives the 15-day safety window before the purge job hard-
    // deletes it — see modules/memory/trash-purge.job.ts.
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    // Hidden from every normal read path (list/search/graph/insights/share)
    // until the vault PIN is unlocked — see modules/vault/. Also set true
    // automatically when the memory belongs to a vaulted collection (see
    // vault.service.ts's cascade), so hiding a whole collection doesn't
    // require every read path to also join collection_memories.
    isVaulted: boolean("is_vaulted").notNull().default(false),
    // User-set, not AI-inferred — when this memory relates to something on a
    // specific date/time (a saved event page, a deadline mentioned in a
    // note). Null means "no event attached." Powers the "Add to calendar"
    // action, which builds a Google Calendar link or .ics file client-side —
    // no calendar OAuth involved.
    eventAt: timestamp("event_at", { withTimezone: true }),
    // How long that event runs, in minutes. Null means the 1-hour default —
    // set by the calendar when an event is created, moved or resized there.
    eventDurationMinutes: integer("event_duration_minutes"),
    // AI-inferred, never user-set — the ingestion pipeline's DetectEvent
    // node's guess at a date/time this memory is "about," if any. Distinct
    // from eventAt above (user-owned/confirmed, drives the real calendar
    // actions) — a suggestion becomes eventAt only when the user explicitly
    // confirms via the detection prompt, through the normal updateMemory
    // path. Never written there automatically.
    suggestedEventAt: timestamp("suggested_event_at", { withTimezone: true }),
    // 0.0-1.0 confidence from DetectEvent. Null when no event was detected.
    // Only clearing EVENT_DETECTION_CONFIDENCE_THRESHOLD (memory.notify.ts)
    // triggers the notification/email/popup fan-out — a lower-confidence
    // guess is still stored here, but stays silent.
    eventDetectionConfidence: real("event_detection_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    // AI ingestion (docs/AI_REQUIREMENTS.md) — populated async by the
    // ingestion pipeline after create, all nullable until that job runs.
    documentEmbedding: vector("document_embedding", EMBEDDING_DIMENSIONS),
    // Populated by a DB trigger from title/description/inferred_intent/content
    // (see the ingestion migration) — the app never writes this column.
    ftsTokens: tsvector("fts_tokens"),
    resourceCategory: text("resource_category"),
    inferredIntent: text("inferred_intent"),
    intentConfidence: real("intent_confidence"),
    // Open-vocabulary content type (e.g. "recipe", "task", "quote" — not
    // constrained to a fixed enum, unlike resourceCategory) plus whatever
    // structured fields the DetectContentType node pulled out of the raw
    // text for that type (e.g. a recipe's ingredients, a task's due date).
    contentType: text("content_type"),
    extractedFields: jsonb("extracted_fields"),
  },
  (table) => [
    index("idx_memories_user_id").on(table.userId),
    index("idx_memories_user_created").on(table.userId, table.createdAt),
    index("idx_memories_user_normalized_url").on(table.userId, table.normalizedUrl),
    // The purge job's whole query is "trashed items older than the cutoff" —
    // partial so it stays tiny (almost every memory has in_trash = false).
    index("idx_memories_trashed_at").on(table.trashedAt).where(sql`${table.inTrash} = true`),
  ]
);

// -----------------------------------------------------------------------------
// 14. Collection <-> Memory Junction Table
// -----------------------------------------------------------------------------
export const collectionMemories = pgTable(
  "collection_memories",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.memoryId] }),
    index("idx_collection_memories_memory_id").on(table.memoryId),
  ]
);

// -----------------------------------------------------------------------------
// 14b. Sharing — one row per shared resource, plus grants and access requests
//
// The four sharing "modes" are two orthogonal axes, not one setting:
//   * shares.linkAccess  — what the *link* does (off / public / ask / password)
//   * shareGrants        — which specific people have access, regardless of the link
// So a link can be public while named people are also invited, and a grantee
// still gets in when the link is switched off. Collapsing these into a single
// enum would make those combinations unexpressible.
// -----------------------------------------------------------------------------
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // A discriminator plus exactly one populated FK, rather than a single
    // polymorphic resource_id. Real FKs buy ON DELETE CASCADE, and both
    // delete paths here are hard deletes — without it, deleting a collection
    // would leave a live slug pointing at nothing.
    resourceType: shareResourceTypeEnum("resource_type").notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "cascade" }),

    slug: varchar("slug", { length: 32 }).notNull().unique(),
    linkAccess: shareLinkAccessEnum("link_access").notNull().default(ShareLinkAccess.DISABLED),

    // scrypt, see modules/share/share.password.ts. passwordUpdatedAt is
    // stamped into every unlock token, so changing or clearing the password
    // invalidates the cookies already handed out without tracking them.
    passwordHash: text("password_hash"),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),

    // Off by default: people paste these links around without expecting
    // search engines to pick them up. Only ever honoured for public links.
    allowSearchIndexing: boolean("allow_search_indexing").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "ck_shares_one_resource",
      sql`(${table.resourceType} = 'collection' AND ${table.collectionId} IS NOT NULL AND ${table.memoryId} IS NULL)
       OR (${table.resourceType} = 'memory' AND ${table.memoryId} IS NOT NULL AND ${table.collectionId} IS NULL)`
    ),
    check(
      "ck_shares_password_present",
      sql`${table.linkAccess} <> 'password' OR ${table.passwordHash} IS NOT NULL`
    ),
    // One share per resource — this is what makes get-or-create idempotent.
    uniqueIndex("uq_shares_collection").on(table.collectionId).where(sql`${table.collectionId} IS NOT NULL`),
    uniqueIndex("uq_shares_memory").on(table.memoryId).where(sql`${table.memoryId} IS NOT NULL`),
    index("idx_shares_owner").on(table.ownerId),
    // Serves the public_share_count plan-limit tally.
    index("idx_shares_owner_link_access").on(table.ownerId, table.linkAccess),
  ]
);

export const shareGrants = pgTable(
  "share_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),

    // Null until somebody signs up with this address — the email, not the
    // user, is the natural key here, because an owner can invite a person
    // who has no account yet.
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // Always stored lowercased; users.email is plain varchar, not citext.
    inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),

    status: shareGrantStatusEnum("status").notNull().default(ShareGrantStatus.PENDING),
    source: shareGrantSourceEnum("source").notNull().default(ShareGrantSource.DIRECT_INVITE),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_share_grants_share_email").on(table.shareId, table.inviteeEmail),
    index("idx_share_grants_user_status").on(table.userId, table.status),
    // Drives the claim at signup. Revoked rows are kept rather than deleted
    // precisely so a revoked invite can't quietly reactivate later.
    index("idx_share_grants_pending_email").on(table.inviteeEmail).where(sql`${table.userId} IS NULL`),
  ]
);

export const shareAccessRequests = pgTable(
  "share_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Requesting access requires an account: it gives the owner a real
    // identity to approve, lets approval create a grant directly, and makes
    // anonymous spam impossible.
    requesterUserId: uuid("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    message: varchar("message", { length: 500 }),
    status: shareAccessRequestStatusEnum("status").notNull().default(ShareAccessRequestStatus.PENDING),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // One *open* request per person per share; decided rows stay as history.
    uniqueIndex("uq_share_access_requests_open")
      .on(table.shareId, table.requesterUserId)
      .where(sql`${table.status} = 'pending'`),
    index("idx_share_access_requests_share_status").on(table.shareId, table.status),
    index("idx_share_access_requests_requester").on(table.requesterUserId),
  ]
);

// -----------------------------------------------------------------------------
// 14b-2. Share views — one row per de-duplicated view, not per HTTP request
//
// A page load is not a view: a signed-in visitor refreshing, a router
// retry, or (concretely) React StrictMode's dev-mode double-effect all
// produce more than one request per human visit. share.service.ts's
// recordShareView only inserts a row (and bumps shares.viewCount) when no
// row already exists for the same viewer within the dedup window, so the
// counter reflects visits, not requests.
// -----------------------------------------------------------------------------
export const shareViews = pgTable(
  "share_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Null for an anonymous visitor. Kept on delete (set null, not cascade)
    // so a share's view history — and its counts — survive the viewer's
    // account being deleted later.
    viewerUserId: uuid("viewer_user_id").references(() => users.id, { onDelete: "set null" }),
    // Only for anonymous dedup/uniqueness — never a raw IP. Salted per-share
    // (see share.service.ts) so the same hash can't correlate one visitor
    // across two different shares.
    viewerIpHash: varchar("viewer_ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_share_views_share_created").on(table.shareId, table.createdAt),
    // The dedup check's own access path: "has this viewer already got a
    // row for this share recently".
    index("idx_share_views_share_viewer").on(table.shareId, table.viewerUserId),
    index("idx_share_views_share_ip").on(table.shareId, table.viewerIpHash),
  ]
);

// -----------------------------------------------------------------------------
// 14c. Notifications
// -----------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    actionUrl: varchar("action_url", { length: 500 }),
    // Deliberately no FK — unlike a share row, a notification should outlive
    // the thing it refers to ("X shared Y with you" still reads fine after Y
    // is deleted, and silently vanishing history is worse than a dead link).
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
    index("idx_notifications_user_unread").on(table.userId).where(sql`${table.readAt} IS NULL`),
  ]
);

// -----------------------------------------------------------------------------
// 15. Tags Table (scoped per-user — a tag name is only unique within its owner)
// -----------------------------------------------------------------------------
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uq_tags_user_name").on(table.userId, table.name)]
);

// -----------------------------------------------------------------------------
// 16. Memory <-> Tag Junction Table
// -----------------------------------------------------------------------------
export const memoryTags = pgTable(
  "memory_tags",
  {
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.memoryId, table.tagId] }),
    index("idx_memory_tags_tag_id").on(table.tagId),
  ]
);

// -----------------------------------------------------------------------------
// 17. Attachments Table (files uploaded to R2 and linked to a memory)
// -----------------------------------------------------------------------------
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_attachments_memory_id").on(table.memoryId)]
);

// -----------------------------------------------------------------------------
// 18. Memory Chunks Table (semantic chunks for RAG retrieval, AI ingestion)
// -----------------------------------------------------------------------------
export const memoryChunks = pgTable(
  "memory_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkContent: text("chunk_content").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", EMBEDDING_DIMENSIONS).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_memory_chunks_user_memory").on(table.userId, table.memoryId)]
);

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
// 20. Feature Flags Table (global config as key/value — auth toggles,
//     signups toggle, maintenance mode, and any future flag, all without a
//     migration per flag. Read via feature-flags.service.ts's typed getters,
//     never raw, by callers like auth.service.ts and the maintenance guard.)
// -----------------------------------------------------------------------------
export const featureFlags = pgTable(
  "feature_flags",
  {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: jsonb("value").notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // e.g. "auth", "system", "experimental"
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_feature_flags_category").on(table.category)]
);

// -----------------------------------------------------------------------------
// 20b. Instance Settings (self-hosted installs only)
//     The infrastructure an admin configures from Admin -> Configuration ->
//     Infrastructure: file storage, vector store, email, embeddings, OAuth.
//     One row per section. Non-secret fields live in `value`; secret fields
//     (API keys, passwords) are a JSON object encrypted with token-cipher's
//     encryptToken in `secret_value`, never returned to the client. Hosted
//     production never reads this table — it's configured only through env.
//     See modules/instance-settings/.
// -----------------------------------------------------------------------------
export const instanceSettings = pgTable("instance_settings", {
  section: varchar("section", { length: 50 }).primaryKey(),
  value: jsonb("value").notNull().default({}),
  secretValue: text("secret_value"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// -----------------------------------------------------------------------------
// 20c. Billing (hosted only — modules/billing)
//     billing_customers: the payment provider's customer id per user, needed
//     to open the provider's billing portal. billing_events: every webhook
//     event id already handled, so a replayed delivery is a no-op.
// -----------------------------------------------------------------------------
export const billingCustomers = pgTable("billing_customers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 30 }).notNull(),
  customerId: varchar("customer_id", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const billingEvents = pgTable("billing_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  provider: varchar("provider", { length: 30 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// -----------------------------------------------------------------------------
// 21. Announcements Table (launch/update countdowns and banners — a history,
//     not a singleton; "only one active" is enforced in the service layer)
// -----------------------------------------------------------------------------
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: announcementTypeEnum("type").notNull().default(AnnouncementType.ANNOUNCEMENT),
    // "full_page" blocks every page (marketing, platform, auth) except /admin,
    // the same way maintenance mode does — for hard launch splashes, not the
    // default sticky-banner treatment.
    displayMode: announcementDisplayModeEnum("display_mode").notNull().default(AnnouncementDisplayMode.BANNER),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    targetDate: timestamp("target_date", { withTimezone: true }),
    ctaLabel: varchar("cta_label", { length: 100 }),
    ctaUrl: text("cta_url"),
    isActive: boolean("is_active").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_announcements_active").on(table.isActive),
    index("idx_announcements_created_at").on(table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 21b. What's New Items Table (the cards in the landing page's "What's new"
//      popup: features that shipped and ones that are coming. Unlike
//      announcements, any number can be active at once; they show as a
//      stack, in sort_order.)
// -----------------------------------------------------------------------------
export const whatsNewItems = pgTable(
  "whats_new_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: whatsNewKindEnum("kind").notNull().default(WhatsNewKind.NEW),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body"),
    // Short points shown as a list under the body.
    bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
    imageUrl: text("image_url"),
    ctaLabel: varchar("cta_label", { length: 60 }),
    ctaUrl: text("cta_url"),
    isActive: boolean("is_active").notNull().default(true),
    // Lower comes first in the stack.
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_whats_new_items_active_order").on(table.isActive, table.sortOrder)]
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
// 23. Admin Audit Logs Table (who did what admin action, to what, when —
//     written from every mutating admin endpoint)
// -----------------------------------------------------------------------------
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g. "user.role.granted", "flag.updated"
    targetType: varchar("target_type", { length: 50 }), // e.g. "user", "feature_flag", "announcement"
    targetId: varchar("target_id", { length: 255 }), // polymorphic — not a strict FK
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_admin_audit_logs_admin_user_created").on(table.adminUserId, table.createdAt),
    index("idx_admin_audit_logs_target").on(table.targetType, table.targetId),
  ]
);

// -----------------------------------------------------------------------------
// 24. Plans Table (admin-editable pricing tiers — Free/Plus/Pro today, but not
//     a hardcoded enum: an admin can rename, reprice, or add a tier without a
//     deploy. `key` is the stable machine identifier other code references;
//     `name` is the only field an admin is expected to change often.)
// -----------------------------------------------------------------------------
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 50 }).notNull().unique(), // e.g. "free", "plus", "pro" — never renamed
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    priceMinor: integer("price_minor").notNull().default(0), // cents
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    billingInterval: planBillingIntervalEnum("billing_interval")
      .notNull()
      .default(PlanBillingInterval.MONTHLY),
    isActive: boolean("is_active").notNull().default(true),
    // Auto-assigned on signup. Only one plan may be default at a time —
    // enforced in the service layer with the same flip-others-first
    // transaction pattern as announcements.isActive.
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // Admin-editable, boolean/on-off perks distinct from the numeric
    // PlanLimitType quota system above (memory_count etc.). Record-keeping
    // only: every plan gets every feature — plans differ only by volume and
    // included AI (see admin/plans/plans.service.ts's DEFAULT_PLANS).
    features: jsonb("features").$type<Record<string, boolean>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_plans_active_sort").on(table.isActive, table.sortOrder)]
);

// -----------------------------------------------------------------------------
// 25. Plan Limits Table (one row per plan per limit type — admin-editable
//     numbers, not code. `limitValue: null` means unlimited.)
// -----------------------------------------------------------------------------
export const planLimits = pgTable(
  "plan_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    limitType: planLimitTypeEnum("limit_type").notNull(),
    limitValue: integer("limit_value"), // null = unlimited
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("uq_plan_limits_plan_type").on(table.planId, table.limitType)]
);

// -----------------------------------------------------------------------------
// 26. User Plan Assignments Table ("subscription" without live billing — a
//     history, not a singleton, same as announcements. Only one ACTIVE
//     assignment per user is enforced in the service layer: inserting a new
//     active row first flips any existing active row to SUPERSEDED. Effective
//     plan resolves lazily — WHERE userId=X AND status='active' AND
//     (endsAt IS NULL OR endsAt > now()), falling back to plans.isDefault.)
// -----------------------------------------------------------------------------
export const userPlanAssignments = pgTable(
  "user_plan_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: planAssignmentStatusEnum("status").notNull().default(PlanAssignmentStatus.ACTIVE),
    source: planAssignmentSourceEnum("source").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }), // null = doesn't expire
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }), // admin who granted it manually
    reason: text("reason"), // admin note, e.g. "30-day Pro goodwill grant"
    // Polymorphic, same style as adminAuditLogs.targetType/targetId — e.g.
    // sourceRefType "referral_conversion" | "coupon_redemption" | "transaction".
    sourceRefType: varchar("source_ref_type", { length: 50 }),
    sourceRefId: varchar("source_ref_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_user_plan_assignments_user_status").on(table.userId, table.status),
    index("idx_user_plan_assignments_ends_at").on(table.endsAt),
  ]
);

// -----------------------------------------------------------------------------
// 27. (Removed: Transactions, Coupons, Coupon Redemptions, Referral Codes,
//     Referral Conversions, Credit Ledger, User Credit Balances — this
//     product has no billing, so there's nothing for any of them to
//     record. plans/planLimits/userPlanAssignments above stayed: they're
//     what grants everyone the single unlimited free plan, not a
//     paid-tier mechanism.)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// 34. Email Campaigns Table (one row per admin bulk-compose action — the
//     subject/body were composed once and fanned out to N recipients, each
//     tracked as its own email_messages row below. Every automatic/system
//     email (welcome, ban notice, share events) has no campaign at all.)
// -----------------------------------------------------------------------------
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: emailCategoryEnum("category").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    bodyText: text("body_text").notNull(),
    // Recorded so the history view can show "sent to all users" vs. a named
    // list without re-deriving it from the individual message rows.
    recipientFilter: jsonb("recipient_filter").$type<{ all: true } | { userIds: string[] }>().notNull(),
    recipientCount: integer("recipient_count").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_email_campaigns_created").on(table.createdAt)]
);

// -----------------------------------------------------------------------------
// 35. Email Messages Table (one row per individual send attempt — system-
//     triggered or part of a campaign — this is what the BullMQ email
//     worker loads by id and updates as it sends. The single source of
//     truth for delivery status; Mailhog/SMTP holds no state of its own.)
// -----------------------------------------------------------------------------
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for every system/automatic send — only the admin bulk composer
    // groups messages under a campaign.
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
    // Null when the recipient has no account yet (e.g. a share invite sent
    // to an email address that hasn't signed up) — recipientEmail is the
    // one field every row is guaranteed to have.
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    category: emailCategoryEnum("category").notNull(),
    templateKey: emailTemplateKeyEnum("template_key").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    // The rendered HTML actually handed to nodemailer — kept for delivery
    // debugging/audit even though Mailhog also stores its own copy.
    bodyHtml: text("body_html").notNull(),
    status: emailStatusEnum("status").notNull().default(EmailStatus.QUEUED),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_email_messages_campaign").on(table.campaignId),
    index("idx_email_messages_recipient_user").on(table.recipientUserId),
    index("idx_email_messages_status_created").on(table.status, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 36. Import Batches Table (one row per bookmarks-file or URL-list import —
//     mirrors email_campaigns' shape: one parent summary row, N child rows.)
// -----------------------------------------------------------------------------
export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceType: importSourceTypeEnum("source_type").notNull(),
    totalCount: integer("total_count").notNull(),
    createdCount: integer("created_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_import_batches_user_created").on(table.userId, table.createdAt)]
);

// -----------------------------------------------------------------------------
// 37. Import Items Table (one row per URL in a batch — memoryId is set null,
//     not cascade, so this history survives even if the memory it created
//     is later deleted.)
// -----------------------------------------------------------------------------
export const importItems = pgTable(
  "import_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    status: importItemStatusEnum("status").notNull(),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_import_items_batch_status").on(table.batchId, table.status)]
);

// -----------------------------------------------------------------------------
// 38. Reports Table (bug reports and feature requests submitted from the
//     public /report page — no auth required, but userId is captured when
//     the submitter happens to be signed in. No admin UI reads this yet;
//     it's reviewable directly via drizzle-kit studio until one exists.)
// -----------------------------------------------------------------------------
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: reportTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    // Optional even when signed in — someone reporting a bug on behalf of a
    // teammate, or just preferring not to be tied to their account email.
    email: varchar("email", { length: 255 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: reportStatusEnum("status").notNull().default(ReportStatus.OPEN),
    // Where they were when they hit "report a bug" — real diagnostic value
    // (which page, which app route) that a free-text description often omits.
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_reports_type").on(table.type),
    index("idx_reports_status").on(table.status),
    index("idx_reports_created_at").on(table.createdAt),
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

// -----------------------------------------------------------------------------
// 41. Relations
// -----------------------------------------------------------------------------
export const  relations = defineRelations({
  users: {
    authIdentities: { relation: "hasMany", foreignKey: "userId" },
    refreshTokens: { relation: "hasMany", foreignKey: "userId" },
    sessions: { relation: "hasMany", foreignKey: "userId" },
    devices: { relation: "hasMany", foreignKey: "userId" },
    userRoles: { relation: "hasMany", foreignKey: "userId" },
    aiUsageLogs: { relation: "hasMany", foreignKey: "userId" },
    collections: { relation: "hasMany", foreignKey: "userId" },
    planAssignments: { relation: "hasMany", foreignKey: "userId" },
    aiCredentials: { relation: "hasMany", foreignKey: "userId" },
    aiRoleAssignments: { relation: "hasMany", foreignKey: "userId" },
    shares: { relation: "hasMany", foreignKey: "ownerId" },
    shareGrants: { relation: "hasMany", foreignKey: "userId" },
    notifications: { relation: "hasMany", foreignKey: "userId" },
    emailCampaigns: { relation: "hasMany", foreignKey: "createdBy" },
    emailMessages: { relation: "hasMany", foreignKey: "recipientUserId" },
    importBatches: { relation: "hasMany", foreignKey: "userId" },
    calendarConnections: { relation: "hasMany", foreignKey: "userId" },
    calendarEventLinks: { relation: "hasMany", foreignKey: "userId" },
  },
  collections: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  shares: {
    owner: { relation: "belongsTo", foreignKey: "ownerId" },
    grants: { relation: "hasMany", foreignKey: "shareId" },
    accessRequests: { relation: "hasMany", foreignKey: "shareId" },
    views: { relation: "hasMany", foreignKey: "shareId" },
  },
  shareGrants: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    user: { relation: "belongsTo", foreignKey: "userId" },
    invitedByUser: { relation: "belongsTo", foreignKey: "invitedBy" },
  },
  shareAccessRequests: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    requester: { relation: "belongsTo", foreignKey: "requesterUserId" },
    decidedByUser: { relation: "belongsTo", foreignKey: "decidedBy" },
  },
  shareViews: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    viewer: { relation: "belongsTo", foreignKey: "viewerUserId" },
  },
  notifications: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  plans: {
    limits: { relation: "hasMany", foreignKey: "planId" },
    assignments: { relation: "hasMany", foreignKey: "planId" },
  },
  planLimits: {
    plan: { relation: "belongsTo", foreignKey: "planId" },
  },
  userPlanAssignments: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    plan: { relation: "belongsTo", foreignKey: "planId" },
    assignedByUser: { relation: "belongsTo", foreignKey: "assignedBy" },
  },
  featureFlags: {
    updatedByUser: { relation: "belongsTo", foreignKey: "updatedBy" },
  },
  announcements: {
    createdByUser: { relation: "belongsTo", foreignKey: "createdBy" },
  },
  reports: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  aiUsageLogs: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    thread: { relation: "belongsTo", foreignKey: "threadId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  adminAuditLogs: {
    adminUser: { relation: "belongsTo", foreignKey: "adminUserId" },
  },
  emailCampaigns: {
    createdByUser: { relation: "belongsTo", foreignKey: "createdBy" },
    messages: { relation: "hasMany", foreignKey: "campaignId" },
  },
  emailMessages: {
    campaign: { relation: "belongsTo", foreignKey: "campaignId" },
    recipient: { relation: "belongsTo", foreignKey: "recipientUserId" },
  },
  importBatches: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    items: { relation: "hasMany", foreignKey: "batchId" },
  },
  importItems: {
    batch: { relation: "belongsTo", foreignKey: "batchId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  roles: {
    userRoles: { relation: "hasMany", foreignKey: "roleId" },
    rolePermissions: { relation: "hasMany", foreignKey: "roleId" },
  },
  permissions: {
    rolePermissions: { relation: "hasMany", foreignKey: "permissionId" },
  },
  authIdentities: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  calendarConnections: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  calendarEventLinks: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  refreshTokens:
  {
    user: { relation: "belongsTo", foreignKey: "userId" },
    sessions: { relation: "hasMany", foreignKey: "refreshTokenId" },
  },
  sessions: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    refreshToken: { relation: "belongsTo", foreignKey: "refreshTokenId" },
  },
  devices: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  userRoles: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    role: { relation: "belongsTo", foreignKey: "roleId" },
  },
  rolePermissions: {
    role: { relation: "belongsTo", foreignKey: "roleId" },
    permission: { relation: "belongsTo", foreignKey: "permissionId" },
  },
  aiCredentials: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    roleAssignments: { relation: "hasMany", foreignKey: "credentialId" },
  },
  aiRoleAssignments: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    credential: { relation: "belongsTo", foreignKey: "credentialId" },
  },
});
