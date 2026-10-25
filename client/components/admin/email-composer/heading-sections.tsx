"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EmailCampaignCategory } from "@/lib/admin-emails";
import { STARTERS, type Draft } from "./draft";
import { Field, Section, TonePicker } from "./fields";

/** Ready-made starting points; choosing one replaces the draft. */
export function StarterSection({ starter, onPick }: { starter: string; onPick: (name: string) => void }) {
  return (
          <Section title="Start from" description="Pick a starting point, then change the words. Choosing one replaces what's below.">
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={starter === entry.name}
                  onClick={() => onPick(entry.name)}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    starter === entry.name ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </Section>
  );
}

export function SubjectSection({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  return (
          <Section title="Subject and heading">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Field label="Subject" hint={`${draft.subject.length}/255`}>
                <Input value={draft.subject} maxLength={255} onChange={(e) => set("subject", e.target.value)} placeholder="What the inbox shows" />
              </Field>
              <Field label="Category">
                <Select
                  items={{ marketing: "Marketing", alert: "Alert", announcement: "Announcement", custom: "Custom" }}
                  value={draft.category}
                  onValueChange={(v) => v && set("category", v as EmailCampaignCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Headline" hint="Optional. Uses the subject if empty">
              <Input value={draft.headline} maxLength={140} onChange={(e) => set("headline", e.target.value)} placeholder={draft.subject || "The big line at the top of the email"} />
            </Field>
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Label" hint="Optional. The small tag above the headline">
                <Input value={draft.label} maxLength={40} onChange={(e) => set("label", e.target.value)} placeholder="From the Savedly team" />
              </Field>
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-foreground">Label colour</span>
                <TonePicker value={draft.tone} onChange={(tone) => set("tone", tone)} label="Label colour" />
              </div>
            </div>
          </Section>
  );
}
