"use client";

import React from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { LoaderCircleIcon as Loader2 } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSettingsGroup } from "@/hooks/use-settings-group";
import { ACCENTS } from "@/lib/accent";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { value: appearance, loading, error, set } = useSettingsGroup("appearance");

  return (
    <div className="space-y-6 max-w-md text-xs font-semibold">

      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Appearance</h3>
        <p className="text-[10px] text-muted-foreground">Adjust visual themes and accents.</p>
      </div>

      {loading && <HugeiconsIcon icon={Loader2} strokeWidth={2.25} className="h-4 w-4 animate-spin text-muted-foreground" />}
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      <div className="space-y-4">

        {/* Theme select */}
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Interface Theme</span>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: "light", label: "Light Theme" },
                { id: "dark", label: "Dark Theme" },
                { id: "system", label: "System Default" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  set("theme", t.id);
                }}
                className={cn(
                  "p-3 rounded-xl border text-center font-bold transition-all text-[10px]",
                  theme === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 hover:bg-muted text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent select */}
        {appearance && (
          <div className="space-y-2 pt-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Accent Color</span>

            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((acc) => (
                <button
                  key={acc.id}
                  aria-pressed={appearance.accentColor === acc.id}
                  onClick={() => set("accentColor", acc.id)}
                  className={cn(
                    "h-8 px-3 rounded-full border flex items-center gap-1.5 transition-all text-[10px]",
                    appearance.accentColor === acc.id
                      ? "border-primary text-primary bg-primary/5 font-bold"
                      : "border-border/60 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: acc.swatch }} />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] font-normal text-muted-foreground">Changes buttons, links and highlights in the app, for your account. The logo, the public website and the admin area stay blue.</p>
          </div>
        )}

      </div>
    </div>
  );
}
