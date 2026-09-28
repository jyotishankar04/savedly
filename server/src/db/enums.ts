export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BANNED = "banned",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

export enum Provider {
  GOOGLE = "google",
  GITHUB = "github",
}

// Which calendar API a calendar_connections row authenticates against —
// distinct from Provider above, which is login identity, not calendar
// write access. See calendar_connections' own doc comment in schema.ts.
export enum CalendarProvider {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
}

export enum OrganizeMode {
  AUTO = "auto",
  MANUAL = "manual",
}

export enum SettingsTheme {
  SYSTEM = "system",
  LIGHT = "light",
  DARK = "dark",
}

export enum AccentColor {
  BLUE = "blue",
  PURPLE = "purple",
  GREEN = "green",
  ORANGE = "orange",
}

export enum MemoryType {
  WEB = "web",
  VIDEO = "video",
  NOTE = "note",
  IMAGE = "image",
  DOCUMENT = "document",
  VOICE = "voice",
}

// A memory always exists once POST /memories returns — this only ever
// describes how much enrichment it received, never whether it exists.
export enum MemoryStatus {
  PROCESSING = "processing",
  READY = "ready",
  PARTIAL = "partial",
  FAILED = "failed",
}

export enum AnnouncementType {
  COUNTDOWN = "countdown",
  ANNOUNCEMENT = "announcement",
  UPDATE = "update",
}

export enum AnnouncementDisplayMode {
  BANNER = "banner",
  FULL_PAGE = "full_page",
}

// A collection either came from the user explicitly creating it, or from the
// system (onboarding defaults, AI-suggested groupings). Only "user" ever
// counts against the collection_count plan limit; conversion is one-way
// (system -> user only — see collection.service.ts's convertToUser).
export enum CollectionSource {
  USER = "user",
  SYSTEM = "system",
}

export enum ShareResourceType {
  COLLECTION = "collection",
  MEMORY = "memory",
}

/**
 * What the share's *link* does, independent of the per-user grants in
 * share_grants — the two compose, so a link can be public while specific
 * people are also invited by name.
 *
 * DISABLED is not "unshared": the row and its slug survive, so an
 * invite-only share still has a stable URL, and re-publishing reuses the
 * same link rather than rotating it. That carries forward the behaviour of
 * the old collections.publicSlug, which was deliberately never regenerated.
 */
export enum ShareLinkAccess {
  DISABLED = "disabled",
  PUBLIC = "public",
  REQUEST = "request",
  PASSWORD = "password",
}

export enum ShareGrantStatus {
  /** Invited by email, but nobody has signed up with that address yet. */
  PENDING = "pending",
  ACTIVE = "active",
  REVOKED = "revoked",
}

export enum ShareGrantSource {
  DIRECT_INVITE = "direct_invite",
  ACCESS_REQUEST = "access_request",
}

export enum ShareAccessRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  DENIED = "denied",
  CANCELLED = "cancelled",
}

export enum NotificationType {
  SHARE_INVITE_RECEIVED = "share_invite_received",
  SHARE_ACCESS_REQUESTED = "share_access_requested",
  SHARE_ACCESS_APPROVED = "share_access_approved",
  SHARE_ACCESS_DENIED = "share_access_denied",
  SHARE_REVOKED = "share_revoked",
  EVENT_DETECTED = "event_detected",
}

export enum PlanLimitType {
  MEMORY_COUNT = "memory_count",
  // The three AI quotas cap *included* AI only — calls made on the platform's
  // key. Anyone using their own key (Settings -> AI) is never limited by
  // them. 0 = no included AI on this plan; null = unlimited.
  // AI_MONTHLY_QUERIES is the Ask-question quota (name kept for the
  // existing enum value).
  AI_MONTHLY_QUERIES = "ai_monthly_queries",
  AI_MONTHLY_SAVES = "ai_monthly_saves",
  AI_MONTHLY_VISION_QUERIES = "ai_monthly_vision_queries",
  // Largest single upload, in MB — a per-file cap, not a running total.
  MAX_FILE_MB = "max_file_mb",
  STORAGE_MB = "storage_mb",
  COLLECTION_COUNT = "collection_count",
  // Counts shares whose link is set to "public". Free plans get a handful;
  // the other sharing modes are gated by plans.features instead.
  PUBLIC_SHARE_COUNT = "public_share_count",
}

export enum PlanBillingInterval {
  MONTHLY = "monthly",
  SEMI_ANNUAL = "semi_annual",
  YEARLY = "yearly",
  ONE_TIME = "one_time",
}

// A user has at most one ACTIVE assignment at a time — inserting a new
// active one flips the previous one to SUPERSEDED (see plans.service.ts),
// mirroring how announcements.isActive is kept singular.
export enum PlanAssignmentStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  SUPERSEDED = "superseded",
}

// Trimmed to the two sources that still exist — REFERRAL_REWARD/
// COUPON_REDEMPTION/PAYMENT were how a paid-tier assignment got granted;
// nothing writes those anymore now that there's no billing (removed along
// with TransactionType/TransactionStatus/CouponDiscountType/
// CouponRedemptionStatus/ReferralCodeType/ReferralConversionStage/
// CreditLedgerReason, which had no reason to exist without it).
export enum PlanAssignmentSource {
  ADMIN_MANUAL = "admin_manual",
  SIGNUP_DEFAULT = "signup_default",
  // A paid plan bought through the billing provider (modules/billing).
  SUBSCRIPTION = "subscription",
}

// TRANSACTIONAL = system-triggered (welcome, status-changed, share events),
// never sent via the bulk composer. The other four are what the admin
// composer's category select offers.
export enum EmailCategory {
  TRANSACTIONAL = "transactional",
  MARKETING = "marketing",
  ALERT = "alert",
  ANNOUNCEMENT = "announcement",
  CUSTOM = "custom",
}

// Which HTML builder rendered the message — kept separate from `category`
// (why it was sent) so a marketing and an announcement bulk send, both
// rendered by the same generic template, stay distinguishable in history.
export enum EmailTemplateKey {
  WELCOME = "welcome",
  USER_STATUS_CHANGED = "user_status_changed",
  SHARE_INVITE = "share_invite",
  SHARE_ACCESS_REQUESTED = "share_access_requested",
  SHARE_ACCESS_APPROVED = "share_access_approved",
  SHARE_ACCESS_DENIED = "share_access_denied",
  ADMIN_CUSTOM = "admin_custom",
  EVENT_DETECTED = "event_detected",
}

export enum EmailStatus {
  QUEUED = "queued",
  SENDING = "sending",
  SENT = "sent",
  FAILED = "failed",
}

export enum ImportSourceType {
  BOOKMARKS_HTML = "bookmarks_html",
  URL_LIST = "url_list",
}

export enum ImportItemStatus {
  CREATED = "created",
  SKIPPED_DUPLICATE = "skipped_duplicate",
  FAILED = "failed",
}

export enum ReportType {
  BUG = "bug",
  FEATURE = "feature",
}

// Named integrations get a first-class client (native tool-calling/message
// format where it matters — Anthropic isn't OpenAI-wire-compatible, unlike
// the other three). CUSTOM is the escape hatch for literally anything else
// with an OpenAI-compatible endpoint (OpenRouter, Together, Fireworks, a
// local Ollama/LM Studio instance, ...) — baseUrl is required only for it.
export enum AiCredentialProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GROQ = "groq",
  GOOGLE = "google",
  CUSTOM = "custom",
  // One key, every model from every provider — OpenAI-compatible at a fixed base URL.
  OPENROUTER = "openrouter",
}

// Mirrors the four model "slots" ai.providers.ts has always had internally
// (fast/reasoning/vision) plus embeddings, now each independently pointed at
// whichever saved credential+model the user assigns it to. EMBEDDINGS is
// pinned to 1536-dimensional output (validated at assignment time, see
// ai-settings.service.ts) because memories.document_embedding and
// memory_chunks.embedding are fixed-width vector(1536) columns.
export enum AiRole {
  FAST = "fast",
  REASONING = "reasoning",
  VISION = "vision",
  EMBEDDINGS = "embeddings",
}

// No IN_PROGRESS — a report is either not yet looked at, actively being
// reviewed, or settled one of two ways. Keeping it this small is deliberate:
// there's no admin UI for this yet (see report.service.ts), so a status
// this simple is one an operator can act on directly in the DB/Studio
// without needing a richer workflow built first.
export enum ReportStatus {
  OPEN = "open",
  REVIEWING = "reviewing",
  RESOLVED = "resolved",
  DECLINED = "declined",
}