"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, type Settings, type SettingsPatch } from "@/lib/settings";

type Group = Omit<Settings, "connectedAccounts" | "timezone">;

export const settingsQueryKey = ["settings"] as const;

export function useSettingsQuery() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: getSettings });
}

/** Loads one settings group and persists field changes with optimistic UI + revert-on-failure. */
export function useSettingsGroup<K extends keyof Group>(group: K) {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error: queryError } = useSettingsQuery();

  const mutation = useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey });
      const previous = queryClient.getQueryData<Settings>(settingsQueryKey);
      if (previous) {
        queryClient.setQueryData<Settings>(settingsQueryKey, {
          ...previous,
          [group]: { ...previous[group], ...patch[group] },
        });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsQueryKey, context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsQueryKey, updated);
    },
  });

  async function set<F extends keyof Group[K]>(field: F, fieldValue: Group[K][F]) {
    if (!settings) return;
    try {
      await mutation.mutateAsync({ [group]: { [field]: fieldValue } } as SettingsPatch);
    } catch {
      // surfaced via `error` (mutation.error) below — callers fire-and-forget this
    }
  }

  const error =
    (queryError instanceof Error ? queryError.message : null) ??
    (mutation.error instanceof Error ? mutation.error.message : null);

  return { value: settings?.[group] ?? null, loading: isLoading, error, set };
}

/**
 * Keeps the server's copy of the user's time zone in step with their
 * browser, so "3 pm" in a saved note is read as 3 pm where they are
 * (server event detection). Sends only when it's missing or has changed.
 */
export function useSyncTimeZone() {
  const queryClient = useQueryClient();
  const { data } = useSettingsQuery();
  React.useEffect(() => {
    if (!data) return;
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || zone === data.timezone) return;
    updateSettings({ timezone: zone })
      .then((updated) => queryClient.setQueryData(settingsQueryKey, updated))
      .catch(() => {
        // Not worth bothering anyone over; it's retried on the next visit.
      });
  }, [data, queryClient]);
}
