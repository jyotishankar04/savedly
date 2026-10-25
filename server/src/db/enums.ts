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

// The accent a person can pick for the app (Settings > Appearance). The
// colours themselves are in client/app/globals.css.
export enum AccentColor {
  BLUE = "blue",
  PURPLE = "purple",
  GREEN = "green",
  ORANGE = "orange",
  INDIGO = "indigo",
  TEAL = "teal",
  PINK = "pink",
  GRAPHITE = "graphite",
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

// A blog post is visible to the public only once published (see blogPosts).
export enum BlogPostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

// Where an item sits on the public roadmap (see roadmapItems): being built
// now, or planned next. What has shipped is the changelog, not this table.
export enum RoadmapStatus {
  NOW = "now",
  NEXT = "next",
}

// What a "What's new" card is telling the visitor about (see whatsNewItems).
export enum WhatsNewKind {
  // Something the product does, with no claim that it just arrived: the launch tour.
  FEATURE = "feature",
  NEW = "new",
  IMPROVED = "improved",
  UPCOMING = "upcoming",
}

export enum AnnouncementDisplayMode {
  BANNER = "banner",
  FULL_PAGE = "full_page",
}

// Only "user" collections count against the collection_count limit. Conversion is one-way (system -> user).
export enum CollectionSource {
  USER = "user",
  SYSTEM = "system",
}

export enum ShareResourceType {
  COLLECTION = "collection",
  MEMORY = "memory",
}

/**
 * What the share link does, independent of per-user grants. DISABLED keeps the row and slug, so
 * re-publishing reuses the same URL.
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
  DUPLICATE_DETECTED = "duplicate_detected",
  // A reminder the user set on a memory ("Remind me tomorrow") is due.
  MEMORY_REMINDER = "memory_reminder",
}

export enum PlanLimitType {
  MEMORY_COUNT = "memory_count",
  // AI quotas cap included AI only (the platform's key); own-key use is never limited. 0 = none,
  // null = unlimited. AI_MONTHLY_SAVES is one per saved item; AI_MONTHLY_QUERIES is the Ask quota.
  AI_MONTHLY_QUERIES = "ai_monthly_queries",
  AI_MONTHLY_SAVES = "ai_monthly_saves",
  // Retired: image reads count as AI processing for their save now. Kept
  // only because Postgres can't drop an enum value; nothing sets or reads it.
  AI_MONTHLY_VISION_QUERIES = "ai_monthly_vision_queries",
  // Largest single upload, in MB — a per-file cap, not a running total.
  MAX_FILE_MB = "max_file_mb",
  // Imports (bookmark files, Pocket/Raindrop exports...) started this month.
  IMPORT_MONTHLY_COUNT = "import_monthly_count",
  STORAGE_MB = "storage_mb",
  COLLECTION_COUNT = "collection_count",
  // Counts shares whose link is set to "public". Free plans get a handful;
  // the other sharing modes are gated by plans.features instead.
  PUBLIC_SHARE_COUNT = "public_share_count",
  // Web lookups this month: the research step on saves and Ask's web search.
  // The search service is always the platform's, so every lookup counts.
  WEB_SEARCH_MONTHLY = "web_search_monthly",
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

// Only the two sources still in use; the payment, coupon and referral sources are gone.
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
  MEMORY_REMINDER = "memory_reminder",
  WEEKLY_DIGEST = "weekly_digest",
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

// Named providers get a first-class client; CUSTOM is any OpenAI-compatible endpoint and is the
// only one that needs baseUrl.
export enum AiCredentialProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GROQ = "groq",
  GOOGLE = "google",
  CUSTOM = "custom",
  // One key, every model from every provider — OpenAI-compatible at a fixed base URL.
  OPENROUTER = "openrouter",
}

// The model slots (fast, reasoning, vision) plus embeddings, each pointed at a saved credential and
// model. EMBEDDINGS is pinned to 1536 dimensions to match the vector(1536) columns.
export enum AiRole {
  FAST = "fast",
  REASONING = "reasoning",
  VISION = "vision",
  EMBEDDINGS = "embeddings",
}

// Deliberately small: no admin UI yet, so an operator can act on a status directly in the database.
export enum ContactMessageStatus {
  NEW = "new",
  READ = "read",
  REPLIED = "replied",
  ARCHIVED = "archived",
}

export enum ReportStatus {
  OPEN = "open",
  REVIEWING = "reviewing",
  RESOLVED = "resolved",
  DECLINED = "declined",
}
// The colours a highlight on a saved page can have.
export enum HighlightColor {
  YELLOW = "yellow",
  GREEN = "green",
  BLUE = "blue",
  PINK = "pink",
  PURPLE = "purple",
}
