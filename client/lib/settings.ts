import { apiFetch } from "@/lib/auth";
import type { AccentId } from "@/lib/accent";

export interface Settings {
  /** IANA time zone from the browser ("Asia/Kolkata"); null until first sent. */
  timezone: string | null;
  ai: {
    autoOrganization: boolean;
    summaries: boolean;
    relatedMemories: boolean;
    semanticSearch: boolean;
    askSavedly: boolean;
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
    /** Emails for reminders set with "Remind me" (the in-app notification always comes). */
    reminderEmails: boolean;
    productUpdates: boolean;
  };
  appearance: {
    theme: "system" | "light" | "dark";
    accentColor: AccentId;
  };
  connectedAccounts: {
    google: boolean;
    github: boolean;
  };
}

type SettingsGroups = Omit<Settings, "connectedAccounts" | "timezone">;
export type SettingsPatch = {
  [K in keyof SettingsGroups]?: Partial<Omit<SettingsGroups[K], "defaultCollectionId">>;
} & { timezone?: string };

export async function getSettings(): Promise<Settings> {
  return apiFetch<Settings>("/settings");
}

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return apiFetch<Settings>("/settings", {
    method: "PATCH",
    body: patch,
  });
}
