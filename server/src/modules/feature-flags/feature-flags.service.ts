import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { env } from "../../config/env";
import { featureFlags } from "../../db/schema";
import type { UpdateFlagInput } from "./feature-flags.schema";

/**
 * Reserved, dot-namespaced keys the app itself consumes (auth gating, the
 * maintenance guard). Anything else is a free-form flag an admin can add —
 * this table has no fixed column set, so new flags never need a migration.
 */
export const RESERVED_FLAG_KEYS = {
  AUTH_GOOGLE_ENABLED: "auth.google.enabled",
  AUTH_GITHUB_ENABLED: "auth.github.enabled",
  AUTH_PASSWORD_ENABLED: "auth.password.enabled",
  SIGNUPS_ENABLED: "signups.enabled",
  MAINTENANCE_ENABLED: "maintenance.enabled",
  MAINTENANCE_MESSAGE: "maintenance.message",
  // Feature: Batch Operations
  BATCH_OPERATIONS_ENABLED: "features.batch.enabled",
  BATCH_MAX_SIZE: "features.batch.max_size",
  // Feature: Advanced Search
  ADVANCED_SEARCH_ENABLED: "features.search.advanced.enabled",
  ADVANCED_SEARCH_MAX_RESULTS: "features.search.advanced.max_results",
  ADVANCED_SEARCH_MAX_QUERY_LENGTH: "features.search.advanced.max_query_length",
  // Feature: Browser Extension
  EXTENSION_CLIPBOARD_MONITORING_ENABLED: "features.extension.clipboard_monitoring.enabled",
  EXTENSION_CONTEXT_MENU_ENABLED: "features.extension.context_menu.enabled",
  // Feature: AI Event Detection
  EVENT_DETECTION_ENABLED: "features.event_detection.enabled",
  EVENT_DETECTION_CONFIDENCE_THRESHOLD: "features.event_detection.confidence_threshold",
  // Feature: Calendar Integration
  CALENDAR_SYNC_ENABLED: "features.calendar.sync.enabled",
  CALENDAR_GOOGLE_ENABLED: "features.calendar.google.enabled",
  // Feature: Email Campaigns
  EMAIL_CAMPAIGNS_ENABLED: "features.email.campaigns.enabled",
  EMAIL_RATE_LIMIT_PER_HOUR: "features.email.rate_limit_per_hour",
  // Feature: Import/Export
  IMPORT_ENABLED: "features.import.enabled",
  EXPORT_ENABLED: "features.export.enabled",
  IMPORT_RATE_LIMIT_PER_DAY: "features.import.rate_limit_per_day",
  // Feature: Vault
  VAULT_ENABLED: "features.vault.enabled",
  VAULT_AUTO_LOCK_TIMEOUT_MS: "features.vault.auto_lock_timeout_ms",
} as const;

const DEFAULT_FLAGS: { key: string; value: unknown; description: string; category: string }[] = [
  // Authentication
  { key: RESERVED_FLAG_KEYS.AUTH_GOOGLE_ENABLED, value: true, description: "Allow signing in with Google.", category: "auth" },
  { key: RESERVED_FLAG_KEYS.AUTH_GITHUB_ENABLED, value: true, description: "Allow signing in with GitHub.", category: "auth" },
  {
    key: RESERVED_FLAG_KEYS.AUTH_PASSWORD_ENABLED,
    value: false,
    description: "Allow signing in with email and password (always on for self-hosted installs).",
    category: "auth",
  },
  { key: RESERVED_FLAG_KEYS.SIGNUPS_ENABLED, value: true, description: "Allow new account signups.", category: "auth" },
  // System
  { key: RESERVED_FLAG_KEYS.MAINTENANCE_ENABLED, value: false, description: "Block non-admin traffic app-wide.", category: "system" },
  {
    key: RESERVED_FLAG_KEYS.MAINTENANCE_MESSAGE,
    value: "We're currently performing maintenance. Please check back soon.",
    description: "Message shown while maintenance mode is on.",
    category: "system",
  },
  // Batch Operations
  { key: RESERVED_FLAG_KEYS.BATCH_OPERATIONS_ENABLED, value: true, description: "Enable batch tagging, moving, and deletion.", category: "features" },
  { key: RESERVED_FLAG_KEYS.BATCH_MAX_SIZE, value: 1000, description: "Maximum number of memories per batch operation.", category: "features" },
  // Advanced Search
  { key: RESERVED_FLAG_KEYS.ADVANCED_SEARCH_ENABLED, value: true, description: "Enable advanced search with Boolean operators.", category: "features" },
  { key: RESERVED_FLAG_KEYS.ADVANCED_SEARCH_MAX_RESULTS, value: 1000, description: "Maximum results per advanced search query.", category: "features" },
  { key: RESERVED_FLAG_KEYS.ADVANCED_SEARCH_MAX_QUERY_LENGTH, value: 500, description: "Maximum length (chars) of a search query.", category: "features" },
  // Browser Extension
  { key: RESERVED_FLAG_KEYS.EXTENSION_CLIPBOARD_MONITORING_ENABLED, value: true, description: "Enable clipboard URL detection in the extension.", category: "features" },
  { key: RESERVED_FLAG_KEYS.EXTENSION_CONTEXT_MENU_ENABLED, value: true, description: "Enable context menu items in the extension.", category: "features" },
  // AI Event Detection
  { key: RESERVED_FLAG_KEYS.EVENT_DETECTION_ENABLED, value: true, description: "Enable AI-powered event detection from captured memories.", category: "features" },
  { key: RESERVED_FLAG_KEYS.EVENT_DETECTION_CONFIDENCE_THRESHOLD, value: 0.6, description: "Min confidence (0.0–1.0) to trigger event notifications.", category: "features" },
  // Calendar Integration
  { key: RESERVED_FLAG_KEYS.CALENDAR_SYNC_ENABLED, value: true, description: "Enable calendar integration and OAuth connections.", category: "features" },
  { key: RESERVED_FLAG_KEYS.CALENDAR_GOOGLE_ENABLED, value: true, description: "Allow Google Calendar OAuth connections.", category: "features" },
  // Email Campaigns
  { key: RESERVED_FLAG_KEYS.EMAIL_CAMPAIGNS_ENABLED, value: true, description: "Enable email campaigns and bulk notifications.", category: "features" },
  { key: RESERVED_FLAG_KEYS.EMAIL_RATE_LIMIT_PER_HOUR, value: 1000, description: "Max emails sent per hour.", category: "features" },
  // Import/Export
  { key: RESERVED_FLAG_KEYS.IMPORT_ENABLED, value: true, description: "Enable memory imports from external sources.", category: "features" },
  { key: RESERVED_FLAG_KEYS.EXPORT_ENABLED, value: true, description: "Enable memory exports and backups.", category: "features" },
  { key: RESERVED_FLAG_KEYS.IMPORT_RATE_LIMIT_PER_DAY, value: 10, description: "Max imports per user per day.", category: "features" },
  // Vault
  { key: RESERVED_FLAG_KEYS.VAULT_ENABLED, value: true, description: "Enable vault feature for private memory storage.", category: "features" },
  { key: RESERVED_FLAG_KEYS.VAULT_AUTO_LOCK_TIMEOUT_MS, value: 300000, description: "Auto-lock vault after N milliseconds (0 = disabled).", category: "features" },
];

/** Idempotent — inserts any reserved flag that doesn't exist yet, leaves existing rows untouched. */
// Flags for features that no longer exist. Removed on start so the admin
// Features page doesn't keep offering a switch that does nothing.
const RETIRED_FLAG_KEYS = ["features.calendar.microsoft.enabled"];

export async function seedDefaultFlags(): Promise<void> {
  for (const flag of DEFAULT_FLAGS) {
    await db.insert(featureFlags).values(flag).onConflictDoNothing({ target: featureFlags.key });
  }
  await db.delete(featureFlags).where(inArray(featureFlags.key, RETIRED_FLAG_KEYS));
  await holdGoogleCalendarForReview();
}

// Recorded once this hold has been applied, so it never runs twice.
const GOOGLE_CALENDAR_HOLD_KEY = "holds.google_calendar_review.applied";

/**
 * The hosted service can't offer Google Calendar until Google has verified
 * its access to calendars: before that, connecting leads to an "unverified
 * app" warning. So the hosted service switches new connections off once,
 * here, and the app shows Google Calendar as coming soon. Events still work
 * in the in-app calendar, which needs no Google access.
 *
 * Applied a single time: after Google approves, an admin turns "Google
 * Calendar" back on in Admin > Features and it stays on across restarts.
 * Self-hosted installs use their own Google project and are left alone.
 */
async function holdGoogleCalendarForReview(): Promise<void> {
  if (env.SELF_HOSTED) return;
  const [applied] = await db
    .insert(featureFlags)
    .values({ key: GOOGLE_CALENDAR_HOLD_KEY, value: true, description: "Internal: the one-time Google Calendar review hold has been applied.", category: "internal" })
    .onConflictDoNothing({ target: featureFlags.key })
    .returning({ key: featureFlags.key });
  if (!applied) return;
  await db.update(featureFlags).set({ value: false, updatedAt: new Date() }).where(eq(featureFlags.key, RESERVED_FLAG_KEYS.CALENDAR_GOOGLE_ENABLED));
  flagCache.clear();
}

export async function listFlags() {
  return db.select().from(featureFlags).orderBy(featureFlags.category, featureFlags.key);
}

// Flags are read on every request (the maintenance check alone runs for each
// one), so values are kept in memory briefly. One process runs the API and
// every worker, so updateFlag clearing the map is enough to apply a change
// at once; the TTL only covers a flag edited directly in the database.
const FLAG_CACHE_MS = 15_000;
const flagCache = new Map<string, { value: unknown; found: boolean; expiresAt: number }>();

async function getFlagValue<T>(key: string, fallback: T): Promise<T> {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.found ? (cached.value as T) : fallback;
  const [row] = await db.select({ value: featureFlags.value }).from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
  flagCache.set(key, { value: row?.value, found: !!row, expiresAt: Date.now() + FLAG_CACHE_MS });
  return row ? (row.value as T) : fallback;
}

export async function updateFlag(key: string, patch: UpdateFlagInput, adminUserId: string) {
  const [before] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);

  const [after] = await db
    .insert(featureFlags)
    .values({
      key,
      value: patch.value,
      description: patch.description,
      category: patch.category,
      updatedBy: adminUserId,
    })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: {
        value: patch.value,
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        updatedBy: adminUserId,
        updatedAt: new Date(),
      },
    })
    .returning();

  flagCache.clear();
  return { before, after };
}

// --- Typed getters — the only way other modules should read a flag's value ---

export async function isProviderEnabled(provider: "google" | "github"): Promise<boolean> {
  const key = provider === "google" ? RESERVED_FLAG_KEYS.AUTH_GOOGLE_ENABLED : RESERVED_FLAG_KEYS.AUTH_GITHUB_ENABLED;
  return getFlagValue<boolean>(key, true);
}

/** Always on for a self-hosted install — it's how the first admin gets in without setting up OAuth. */
export async function isPasswordAuthEnabled(): Promise<boolean> {
  if (env.SELF_HOSTED) return true;
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.AUTH_PASSWORD_ENABLED, false);
}

export async function isSignupsEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.SIGNUPS_ENABLED, true);
}

export async function isMaintenanceMode(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.MAINTENANCE_ENABLED, false);
}

export async function getMaintenanceMessage(): Promise<string> {
  return getFlagValue<string>(RESERVED_FLAG_KEYS.MAINTENANCE_MESSAGE, "We're currently performing maintenance. Please check back soon.");
}

// Batch Operations
export async function isBatchOperationsEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.BATCH_OPERATIONS_ENABLED, true);
}

export async function getBatchMaxSize(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.BATCH_MAX_SIZE, 1000);
}

// Advanced Search
export async function isAdvancedSearchEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.ADVANCED_SEARCH_ENABLED, true);
}

export async function getAdvancedSearchMaxResults(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.ADVANCED_SEARCH_MAX_RESULTS, 1000);
}

export async function getAdvancedSearchMaxQueryLength(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.ADVANCED_SEARCH_MAX_QUERY_LENGTH, 500);
}

// Browser Extension
export async function isExtensionClipboardMonitoringEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.EXTENSION_CLIPBOARD_MONITORING_ENABLED, true);
}

export async function isExtensionContextMenuEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.EXTENSION_CONTEXT_MENU_ENABLED, true);
}

// AI Event Detection
export async function isEventDetectionEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.EVENT_DETECTION_ENABLED, true);
}

export async function getEventDetectionConfidenceThreshold(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.EVENT_DETECTION_CONFIDENCE_THRESHOLD, 0.6);
}

// Calendar Integration
export async function isCalendarSyncEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.CALENDAR_SYNC_ENABLED, true);
}

export async function isCalendarProviderEnabled(_provider: "google"): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.CALENDAR_GOOGLE_ENABLED, true);
}

// Email Campaigns
export async function isEmailCampaignsEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.EMAIL_CAMPAIGNS_ENABLED, true);
}

export async function getEmailRateLimitPerHour(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.EMAIL_RATE_LIMIT_PER_HOUR, 1000);
}

// Import/Export
export async function isImportEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.IMPORT_ENABLED, true);
}

export async function isExportEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.EXPORT_ENABLED, true);
}

export async function getImportRateLimitPerDay(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.IMPORT_RATE_LIMIT_PER_DAY, 10);
}

// Vault
export async function isVaultEnabled(): Promise<boolean> {
  return getFlagValue<boolean>(RESERVED_FLAG_KEYS.VAULT_ENABLED, true);
}

export async function getVaultAutoLockTimeoutMs(): Promise<number> {
  return getFlagValue<number>(RESERVED_FLAG_KEYS.VAULT_AUTO_LOCK_TIMEOUT_MS, 300000);
}
