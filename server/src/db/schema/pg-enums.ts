import { pgEnum } from "drizzle-orm/pg-core";
import { AccentColor, AiCredentialProvider, AiRole, AnnouncementDisplayMode, WhatsNewKind, RoadmapStatus, ContactMessageStatus, BlogPostStatus, AnnouncementType, CalendarProvider, CollectionSource, EmailCategory, EmailStatus, EmailTemplateKey, ImportItemStatus, ImportSourceType, MemoryStatus, MemoryType, NotificationType, OrganizeMode, PlanAssignmentSource, PlanAssignmentStatus, PlanBillingInterval, PlanLimitType, Provider, ReportStatus, ReportType, SettingsTheme, ShareAccessRequestStatus, ShareGrantSource, ShareGrantStatus, ShareLinkAccess, ShareResourceType, UserStatus, HighlightColor } from "../enums";

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
  AccentColor.INDIGO,
  AccentColor.TEAL,
  AccentColor.PINK,
  AccentColor.GRAPHITE,
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

export const whatsNewKindEnum = pgEnum("whats_new_kind", [WhatsNewKind.FEATURE, WhatsNewKind.NEW, WhatsNewKind.IMPROVED, WhatsNewKind.UPCOMING]);

export const roadmapStatusEnum = pgEnum("roadmap_status", [RoadmapStatus.NOW, RoadmapStatus.NEXT]);

export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  ContactMessageStatus.NEW,
  ContactMessageStatus.READ,
  ContactMessageStatus.REPLIED,
  ContactMessageStatus.ARCHIVED,
]);

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
  PlanLimitType.WEB_SEARCH_MONTHLY,
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
  NotificationType.DUPLICATE_DETECTED,
  NotificationType.MEMORY_REMINDER,
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
  EmailTemplateKey.MEMORY_REMINDER,
  EmailTemplateKey.WEEKLY_DIGEST,
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
// 2b. Calendar Connections Table
// -----------------------------------------------------------------------------
export const calendarProviderEnum = pgEnum("calendar_provider", [
  CalendarProvider.GOOGLE,
  CalendarProvider.MICROSOFT,
]);

// -----------------------------------------------------------------------------
// Highlights: passages marked on a saved page (the extension's highlighter).
// prefix/suffix are a few dozen characters on either side, so the passage can
// be found again on the page when it's revisited, even if it repeats.
// -----------------------------------------------------------------------------
export const highlightColorEnum = pgEnum("highlight_color", [
  HighlightColor.YELLOW,
  HighlightColor.GREEN,
  HighlightColor.BLUE,
  HighlightColor.PINK,
  HighlightColor.PURPLE,
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", [BlogPostStatus.DRAFT, BlogPostStatus.PUBLISHED]);
