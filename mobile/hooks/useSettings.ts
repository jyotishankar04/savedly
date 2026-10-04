import { useCallback, useEffect, useState } from "react";
import { getSettings, updateSettings, type Settings, type SettingsPatch } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setError("Couldn't load settings."));
  }, []);

  const patch = useCallback(
    async (update: SettingsPatch) => {
      if (!settings) return;
      const merged = { ...settings } as Record<string, unknown>;
      const settingsRecord = settings as unknown as Record<string, unknown>;
      const updateRecord = update as unknown as Record<string, object>;
      for (const key of Object.keys(update)) {
        merged[key] = { ...(settingsRecord[key] as object), ...updateRecord[key] };
      }
      setSettings(merged as unknown as Settings);
      try {
        const result = await updateSettings(update);
        setSettings(result);
      } catch {
        setSettings(settings);
      }
    },
    [settings],
  );

  return { settings, error, patch };
}
