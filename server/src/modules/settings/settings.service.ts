import { eq } from "drizzle-orm";
import { db } from "../../db";
import { authIdentities, userSettings } from "../../db/schema";
import { AccentColor, Provider, SettingsTheme } from "../../db/enums";
import type { UpdateSettingsInput } from "./settings.schema";

export interface SettingsResponse {
  /** IANA time zone from the user's browser, or null when not known yet. */
  timezone: string | null;
  ai: {
    autoOrganization: boolean;
    summaries: boolean;
    relatedMemories: boolean;
    semanticSearch: boolean;
    askMemora: boolean;
  };
  capture: {
    extractContent: boolean;
    generateTitle: boolean;
    generateSummary: boolean;
    suggestTags: boolean;
    defaultCollectionId: string | null;
  };
  notifications: {
    weeklySummary: boolean;
    forgottenMemories: boolean;
    productUpdates: boolean;
  };
  appearance: {
    theme: SettingsTheme;
    accentColor: AccentColor;
  };
  connectedAccounts: {
    google: boolean;
    github: boolean;
  };
}

const DEFAULTS: Omit<SettingsResponse, "connectedAccounts"> = {
  timezone: null,
  ai: { autoOrganization: true, summaries: true, relatedMemories: true, semanticSearch: true, askMemora: true },
  capture: { extractContent: true, generateTitle: true, generateSummary: true, suggestTags: true, defaultCollectionId: null },
  notifications: { weeklySummary: true, forgottenMemories: true, productUpdates: false },
  appearance: { theme: SettingsTheme.SYSTEM, accentColor: AccentColor.BLUE },
};

async function getConnectedAccounts(userId: string): Promise<SettingsResponse["connectedAccounts"]> {
  const identities = await db
    .select({ provider: authIdentities.provider })
    .from(authIdentities)
    .where(eq(authIdentities.userId, userId));

  return {
    google: identities.some((i) => i.provider === Provider.GOOGLE),
    github: identities.some((i) => i.provider === Provider.GITHUB),
  };
}

export async function getSettings(userId: string): Promise<SettingsResponse> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const connectedAccounts = await getConnectedAccounts(userId);

  if (!row) {
    return { ...DEFAULTS, connectedAccounts };
  }

  return {
    timezone: row.timezone ?? null,
    ai: {
      autoOrganization: row.aiAutoOrganization,
      summaries: row.aiSummaries,
      relatedMemories: row.aiRelatedMemories,
      semanticSearch: row.aiSemanticSearch,
      askMemora: row.aiAskMemora,
    },
    capture: {
      extractContent: row.captureExtractContent,
      generateTitle: row.captureGenerateTitle,
      generateSummary: row.captureGenerateSummary,
      suggestTags: row.captureSuggestTags,
      defaultCollectionId: null,
    },
    notifications: {
      weeklySummary: row.notifyWeeklySummary,
      forgottenMemories: row.notifyForgottenMemories,
      productUpdates: row.notifyProductUpdates,
    },
    appearance: {
      theme: row.theme,
      accentColor: row.accentColor,
    },
    connectedAccounts,
  };
}

export async function updateSettings(userId: string, patch: UpdateSettingsInput): Promise<SettingsResponse> {
  const columns: Record<string, boolean | string | SettingsTheme | AccentColor | Date> = { updatedAt: new Date() };

  if (patch.timezone !== undefined) columns.timezone = patch.timezone;

  if (patch.ai?.autoOrganization !== undefined) columns.aiAutoOrganization = patch.ai.autoOrganization;
  if (patch.ai?.summaries !== undefined) columns.aiSummaries = patch.ai.summaries;
  if (patch.ai?.relatedMemories !== undefined) columns.aiRelatedMemories = patch.ai.relatedMemories;
  if (patch.ai?.semanticSearch !== undefined) columns.aiSemanticSearch = patch.ai.semanticSearch;
  if (patch.ai?.askMemora !== undefined) columns.aiAskMemora = patch.ai.askMemora;

  if (patch.capture?.extractContent !== undefined) columns.captureExtractContent = patch.capture.extractContent;
  if (patch.capture?.generateTitle !== undefined) columns.captureGenerateTitle = patch.capture.generateTitle;
  if (patch.capture?.generateSummary !== undefined) columns.captureGenerateSummary = patch.capture.generateSummary;
  if (patch.capture?.suggestTags !== undefined) columns.captureSuggestTags = patch.capture.suggestTags;

  if (patch.notifications?.weeklySummary !== undefined) columns.notifyWeeklySummary = patch.notifications.weeklySummary;
  if (patch.notifications?.forgottenMemories !== undefined) columns.notifyForgottenMemories = patch.notifications.forgottenMemories;
  if (patch.notifications?.productUpdates !== undefined) columns.notifyProductUpdates = patch.notifications.productUpdates;

  if (patch.appearance?.theme !== undefined) columns.theme = patch.appearance.theme as SettingsTheme;
  if (patch.appearance?.accentColor !== undefined) columns.accentColor = patch.appearance.accentColor as AccentColor;

  const hasChanges = Object.keys(columns).length > 1;
  if (hasChanges) {
    await db
      .insert(userSettings)
      .values({ userId, ...columns })
      .onConflictDoUpdate({ target: userSettings.userId, set: columns });
  }

  return getSettings(userId);
}
