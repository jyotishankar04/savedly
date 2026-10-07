"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check, LoaderCircleIcon as Loader2 } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSettingsGroup } from "@/hooks/use-settings-group";

export default function NotificationsSettingsPage() {
  const { value: notifications, loading, error, set } = useSettingsGroup("notifications");

  return (
    <div className="space-y-6 max-w-md text-xs font-semibold">

      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Notifications</h3>
        <p className="text-[10px] text-muted-foreground">Manage your rediscovery alerts frequencies.</p>
      </div>

      {loading && <HugeiconsIcon icon={Loader2} strokeWidth={2.25} className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {notifications && (
        <div className="space-y-4">
          {(
            [
              { key: "weeklySummary", title: "Weekly memories summary email", desc: "Receive highlights of items saved during the week." },
              { key: "forgottenMemories", title: "Forgotten memories alerts", desc: "Periodic notification of high-value saves from months ago." },
              { key: "productUpdates", title: "Product news & announcements", desc: "Emails from the team about new features and changes." },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => set(item.key, !notifications[item.key])}
              className="w-full text-left p-3.5 border border-border bg-card rounded-xl hover:border-primary/20 transition-all flex items-start justify-between gap-4"
            >
              <div>
                <h4 className="text-foreground">{item.title}</h4>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-relaxed font-medium">{item.desc}</p>
              </div>

              <div
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all",
                  notifications[item.key] ? "bg-primary border-primary text-white" : "border-border bg-background"
                )}
              >
                {notifications[item.key] && <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-3.5 w-3.5 stroke-[2.5]" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
