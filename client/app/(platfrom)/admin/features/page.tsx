"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { listFlags, updateFlag } from "@/lib/feature-flags";
import { toast } from "@/components/ui/toast";

const FEATURE_CATEGORIES = {
  batch: {
    title: "Batch Operations",
    description: "Control batch tagging, moving, and deletion of memories",
    flags: ["features.batch.enabled", "features.batch.max_size"],
  },
  search: {
    title: "Advanced Search",
    description: "Boolean query search with AND/OR/NOT operators",
    flags: ["features.search.advanced.enabled", "features.search.advanced.max_results", "features.search.advanced.max_query_length"],
  },
  extension: {
    title: "Browser Extension",
    description: "Clipboard monitoring and context menu items",
    flags: ["features.extension.clipboard_monitoring.enabled", "features.extension.context_menu.enabled"],
  },
  event_detection: {
    title: "AI Event Detection",
    description: "Auto-detect events from captured memories",
    flags: ["features.event_detection.enabled", "features.event_detection.confidence_threshold"],
  },
  calendar: {
    title: "Calendar Integration",
    description: "OAuth sync with Google Calendar and Microsoft Outlook",
    flags: ["features.calendar.sync.enabled", "features.calendar.google.enabled", "features.calendar.microsoft.enabled"],
  },
  email: {
    title: "Email Campaigns",
    description: "Bulk emails and notifications",
    flags: ["features.email.campaigns.enabled", "features.email.rate_limit_per_hour"],
  },
  import: {
    title: "Import & Export",
    description: "Bulk data import/export and backups",
    flags: ["features.import.enabled", "features.export.enabled", "features.import.rate_limit_per_day"],
  },
  vault: {
    title: "Vault",
    description: "Private encrypted memory storage",
    flags: ["features.vault.enabled", "features.vault.auto_lock_timeout_ms"],
  },
} as const;

const FLAG_LABELS: Record<string, { label: string; type: "boolean" | "number"; help: string }> = {
  "features.batch.enabled": {
    label: "Enabled",
    type: "boolean",
    help: "Allow batch operations",
  },
  "features.batch.max_size": {
    label: "Max batch size",
    type: "number",
    help: "Maximum memories per batch operation",
  },
  "features.search.advanced.enabled": {
    label: "Enabled",
    type: "boolean",
    help: "Allow advanced Boolean search queries",
  },
  "features.search.advanced.max_results": {
    label: "Max results",
    type: "number",
    help: "Maximum results returned per query",
  },
  "features.search.advanced.max_query_length": {
    label: "Max query length",
    type: "number",
    help: "Maximum characters allowed in a query",
  },
  "features.extension.clipboard_monitoring.enabled": {
    label: "Clipboard monitoring",
    type: "boolean",
    help: "Detect URLs copied to clipboard",
  },
  "features.extension.context_menu.enabled": {
    label: "Context menu enabled",
    type: "boolean",
    help: "Show context menu items in the browser",
  },
  "features.event_detection.enabled": {
    label: "Enabled",
    type: "boolean",
    help: "Run AI event detection on new captures",
  },
  "features.event_detection.confidence_threshold": {
    label: "Confidence threshold",
    type: "number",
    help: "Min confidence (0.0–1.0) to notify users of detected events",
  },
  "features.calendar.sync.enabled": {
    label: "Sync enabled",
    type: "boolean",
    help: "Allow calendar OAuth connections",
  },
  "features.calendar.google.enabled": {
    label: "Google Calendar",
    type: "boolean",
    help: "Allow Google Calendar OAuth",
  },
  "features.calendar.microsoft.enabled": {
    label: "Microsoft Calendar",
    type: "boolean",
    help: "Allow Outlook/Microsoft Calendar OAuth",
  },
  "features.email.campaigns.enabled": {
    label: "Campaigns enabled",
    type: "boolean",
    help: "Allow bulk email notifications",
  },
  "features.email.rate_limit_per_hour": {
    label: "Emails per hour",
    type: "number",
    help: "Max emails sent per hour",
  },
  "features.import.enabled": {
    label: "Import enabled",
    type: "boolean",
    help: "Allow importing memories from external sources",
  },
  "features.export.enabled": {
    label: "Export enabled",
    type: "boolean",
    help: "Allow exporting and backing up memories",
  },
  "features.import.rate_limit_per_day": {
    label: "Imports per day",
    type: "number",
    help: "Max import jobs per user per day",
  },
  "features.vault.enabled": {
    label: "Vault enabled",
    type: "boolean",
    help: "Enable the vault feature",
  },
  "features.vault.auto_lock_timeout_ms": {
    label: "Auto-lock timeout (ms)",
    type: "number",
    help: "Milliseconds before vault auto-locks (0 = disabled)",
  },
};

export default function AdminFeaturesPage() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [numInputDrafts, setNumInputDrafts] = useState<Record<string, string>>({});

  const { data: flags, isLoading, isError } = useQuery({
    queryKey: ["admin", "flags"],
    queryFn: listFlags,
  });

  const flagByKey = new Map((flags ?? []).map((f) => [f.key, f]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "flags"] });

  const updateValue = async (key: string, value: unknown) => {
    setPending(key);
    try {
      const meta = FLAG_LABELS[key];
      await updateFlag(key, value as string | number | boolean);
      invalidate();
      toast.add({
        title: `${meta?.label || key} updated.`,
        type: "success",
      });
      setNumInputDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      toast.add({ title: "Failed to update flag.", type: "error" });
    } finally {
      setPending(null);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (isError) return <p className="text-xs text-destructive">Failed to load features.</p>;

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-lg font-bold text-foreground">Feature Controls</h1>
      <p className="text-xs text-muted-foreground">Manage feature flags, rate limits, and thresholds for all recent features.</p>

      {Object.entries(FEATURE_CATEGORIES).map(([key, category]) => {
        const categoryFlags = category.flags.map((flagKey) => ({
          key: flagKey,
          flag: flagByKey.get(flagKey),
          meta: FLAG_LABELS[flagKey],
        }));

        return (
          <section key={key} className="space-y-3 p-4 border border-border rounded-xl bg-muted/30">
            <div>
              <h3 className="text-sm font-bold text-foreground">{category.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{category.description}</p>
            </div>

            <div className="space-y-2">
              {categoryFlags.map(({ key: flagKey, flag, meta }) =>
                !flag || !meta ? null : meta.type === "boolean" ? (
                  <div key={flagKey} className="flex items-start justify-between gap-4 p-2 bg-background rounded border border-border/50">
                    <div>
                      <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{meta.help}</p>
                    </div>
                    <Switch
                      checked={Boolean(flag.value)}
                      onCheckedChange={(v) => updateValue(flagKey, v)}
                      disabled={pending === flagKey}
                    />
                  </div>
                ) : (
                  <div key={flagKey} className="flex items-start justify-between gap-4 p-2 bg-background rounded border border-border/50">
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{meta.help}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        step={meta.label.includes("threshold") ? "0.1" : "1"}
                        value={numInputDrafts[flagKey] ?? (String(flag.value) || "")}
                        onChange={(e) => setNumInputDrafts((prev) => ({ ...prev, [flagKey]: e.target.value }))}
                        onBlur={() => {
                          const val = numInputDrafts[flagKey];
                          if (val !== undefined && val !== String(flag.value)) {
                            const num = meta.label.includes("threshold") ? parseFloat(val) : parseInt(val, 10);
                            if (!isNaN(num)) {
                              updateValue(flagKey, num);
                            } else {
                              toast.add({ title: "Invalid number.", type: "error" });
                              setNumInputDrafts((prev) => {
                                const next = { ...prev };
                                delete next[flagKey];
                                return next;
                              });
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const target = e.currentTarget;
                            target.blur();
                          }
                        }}
                        className="w-24 h-7 text-xs"
                        disabled={pending === flagKey}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
