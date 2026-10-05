import { apiFetch } from "@/lib/api";

export interface Settings {
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
    theme: "system" | "light" | "dark";
    accentColor: "blue" | "purple" | "green" | "orange";
  };
  connectedAccounts: {
    google: boolean;
    github: boolean;
  };
}

export type SettingsPatch = {
  [K in keyof Omit<Settings, "connectedAccounts">]?: Partial<Omit<Settings[K], "defaultCollectionId">>;
};

export async function getSettings(): Promise<Settings> {
  return apiFetch<Settings>("/settings");
}

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return apiFetch<Settings>("/settings", { method: "PATCH", body: patch });
}
