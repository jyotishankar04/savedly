"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { EmailTone } from "@/lib/admin-emails";
import { TONES } from "./draft";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TonePicker({ value, onChange, label }: { value: EmailTone; onChange: (tone: EmailTone) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {TONES.map((tone) => (
        <button
          key={tone.value}
          type="button"
          role="radio"
          aria-checked={value === tone.value}
          aria-label={tone.name}
          title={tone.name}
          onClick={() => onChange(tone.value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
            value === tone.value ? "border-foreground" : "border-transparent hover:border-border",
          )}
        >
          <span className={cn("h-4 w-4 rounded-full", tone.swatch)} />
        </button>
      ))}
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
