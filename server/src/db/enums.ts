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

// Calendar API a calendar_connections row authenticates against; not the login Provider.
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

// Accent colour choices (Settings > Appearance); the colours are in client/app/globals.css.
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

// A memory always exists once POST /memories returns; this only says how much enrichment it got.
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

// Roadmap position: being built now or planned next. Shipped work is the changelog.
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
 * What the share link does, independent of grants. DISABLED keeps the row and slug, so
 * re-publishing reuses the URL.
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
  MEMORY_REMINDER = "memory_reminder",
}

export enum PlanLimitType {
  MEMORY_COUNT = "memory_count",
  // AI quotas cap included AI only (platform key); own-key use is never limited. 0 = none, null = unlimited.
  AI_MONTHLY_QUERIES = "ai_monthly_queries",
  AI_MONTHLY_SAVES = "ai_monthly_saves",
  // Retired (image reads count in AI_MONTHLY_SAVES); kept because Postgres can't drop an enum value.
  AI_MONTHLY_VISION_QUERIES = "ai_monthly_vision_queries",
  // Largest single upload, in MB — a per-file cap, not a running total.
  MAX_FILE_MB = "max_file_mb",
  IMPORT_MONTHLY_COUNT = "import_monthly_count",
  STORAGE_MB = "storage_mb",
  COLLECTION_COUNT = "collection_count",
  // Counts shares whose link is "public"; other sharing modes are gated by plans.features.
  PUBLIC_SHARE_COUNT = "public_share_count",
  // Web lookups this month (saves and Ask); the search service is always the platform's, so all count.
  WEB_SEARCH_MONTHLY = "web_search_monthly",
}

export enum PlanBillingInterval {
  MONTHLY = "monthly",
  SEMI_ANNUAL = "semi_annual",
  YEARLY = "yearly",
  ONE_TIME = "one_time",
}

// At most one ACTIVE assignment per user: a new one flips the old to SUPERSEDED (plans.service.ts).
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
  SUBSCRIPTION = "subscription",
}

// TRANSACTIONAL is system-triggered and never sent via the bulk composer; the others are the
// composer's choices.
export enum EmailCategory {
  TRANSACTIONAL = "transactional",
  MARKETING = "marketing",
  ALERT = "alert",
  ANNOUNCEMENT = "announcement",
  CUSTOM = "custom",
}

// Which HTML builder rendered the message, separate from `category` (why it was sent).
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

// CUSTOM is any OpenAI-compatible endpoint and the only one that needs baseUrl.
export enum AiCredentialProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GROQ = "groq",
  GOOGLE = "google",
  CUSTOM = "custom",
  // One key, every model from every provider — OpenAI-compatible at a fixed base URL.
  OPENROUTER = "openrouter",
}

// Model slots (fast, reasoning, vision) plus embeddings. EMBEDDINGS is pinned to 1536 dimensions
// (the vector(1536) columns).
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
export enum HighlightColor {
  YELLOW = "yellow",
  GREEN = "green",
  BLUE = "blue",
  PINK = "pink",
  PURPLE = "purple",
}
