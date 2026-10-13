"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check, LoaderCircleIcon as Loader2 } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSettingsGroup } from "@/hooks/use-settings-group";

export default function CaptureSettingsPage() {
  const { value: capture, loading, error, set } = useSettingsGroup("capture");

  return (
    <div className="space-y-6 max-w-md text-xs font-semibold">

      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Capture Settings</h3>
        <p className="text-[10px] text-muted-foreground">Adjust bookmark extraction behaviors.</p>
      </div>

      {loading && <HugeiconsIcon icon={Loader2} strokeWidth={2.25} className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {capture && (
        <div className="space-y-4">
          {(
            [
              { key: "extractContent", title: "Automatically extract page content", desc: "Fetch body text from URL to indexing databases." },
              { key: "generateTitle", title: "Generate title", desc: "Use AI to clean web metadata headings." },
              { key: "generateSummary", title: "Generate summary", desc: "Create concise intent summaries." },
              { key: "suggestTags", title: "Suggest tags", desc: "Auto-extract tags for folder structures." },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => set(item.key, !capture[item.key])}
              className="w-full text-left p-3.5 border border-border bg-card rounded-xl hover:border-primary/20 transition-all flex items-start justify-between gap-4"
            >
              <div>
                <h4 className="text-foreground">{item.title}</h4>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-relaxed font-medium">{item.desc}</p>
              </div>

              <div
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all",
                  capture[item.key] ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
                )}
              >
                {capture[item.key] && <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-3.5 w-3.5 stroke-[2.5]" />}
              </div>
            </button>
          ))}

          {/* Default collection — disabled until the collections feature exists */}
          <div className="space-y-2 pt-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Default Collection</span>
            <select
              disabled
              className="w-full bg-muted/40 border border-input rounded-xl px-3 py-2 text-muted-foreground cursor-not-allowed"
            >
              <option>None (Inbox)</option>
            </select>
            <p className="text-[9px] text-muted-foreground">Collections aren&apos;t available yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
