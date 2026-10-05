"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  GithubIcon as Github,
  Key01Icon as Key,
  Share02Icon as Share,
  LockPasswordIcon as Lock,
  MessageSquareIcon as MessageSquare,
  RocketIcon as Rocket,
  Layers01Icon as Layers,
} from "@hugeicons/core-free-icons";

interface Entry {
  period: string;
  title: string;
  badge: string;
  changes: string[];
  icon: IconSvgElement;
}

// Real milestones, grouped roughly by when they shipped — no version numbers,
// since this product has never had a formal numbered release. The oldest
// entries here are deliberately not the literal first commit: this list is
// what changed for someone using the product, not an exhaustive commit log.
const updates: Entry[] = [
  {
    period: "September 2026",
    title: "Free, Lite, and Pro",
    badge: "Pricing",
    icon: Layers,
    changes: [
      "Hosted plans are now Free, Lite, and Pro — AI is run for you on every one of them, up to each plan's monthly allowance, so there's nothing to configure to start saving or asking.",
      "Lite adds the private vault, calendar sync, and bulk actions across memories; Pro adds direct shares and invite-only access with approval.",
      "Self-hosting is unaffected: every feature stays free and unlimited, and you can still connect your own AI key from Settings → AI.",
    ],
  },
  {
    period: "September 2026",
    title: "Open source, and actually free",
    badge: "Relaunch",
    icon: Github,
    changes: [
      "No more paid tiers or usage limits — every feature is unlimited on every account, and the code itself is open source.",
      "AI is bring-your-own-key: connect OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint from Settings → AI. We cover embeddings by default so search works without any setup.",
      "Ask SaveForLatter can now create, edit, and delete memories and file them into collections directly — not just search and report back.",
      "A floating Ask button is available from anywhere in the app, as a popup or a resizable docked sidebar.",
    ],
  },
  {
    period: "September 2026",
    title: "Sharing, calendar sync, and better search",
    badge: "Feature",
    icon: Share,
    changes: [
      "Share a memory or collection with a public link, a password-protected link, or invite-only access with approval requests.",
      "Connect Google Calendar — AI-detected events can be pushed to your calendar in one click.",
      "Advanced search filters (type, collection, tag, date range) and bulk batch actions across memories.",
    ],
  },
  {
    period: "September 2026",
    title: "Vault and the memory graph",
    badge: "Feature",
    icon: Lock,
    changes: [
      "A PIN-gated Vault for memories you'd rather keep out of your regular views.",
      "A visual memory graph showing how your saved items connect by meaning, tag, and collection.",
      "Trashed memories now stick around for 15 days before being permanently removed, instead of disappearing immediately.",
    ],
  },
  {
    period: "September 2026",
    title: "Ask SaveForLatter launches",
    badge: "Feature",
    icon: MessageSquare,
    changes: [
      "A chat assistant that searches your saved memories and answers in plain English, every claim traceable back to a real saved item.",
      "Hybrid search under the hood: keyword and meaning-based matching merged into one ranked result list.",
    ],
  },
  {
    period: "August–September 2026",
    title: "Rebrand and a real dashboard",
    badge: "Update",
    icon: Rocket,
    changes: [
      "Rebranded from an earlier working name to SaveForLatter.",
      "Replaced mocked Archive, Trash, Notifications, and Insights pages with real data throughout the dashboard.",
      "A first-time product tour for new accounts.",
    ],
  },
  {
    period: "Earlier",
    title: "The foundation",
    badge: "Early build",
    icon: Key,
    changes: [
      "Capture links, notes, images, documents, and voice into one place, each read and enriched on the way in.",
      "Collections and tags for organizing what you save.",
      "Google and GitHub sign-in — no passwords to manage.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-20">

        {/* Header */}
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4 mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Updates
          </span>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
            Product Changelog.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            What&apos;s actually shipped, in roughly the order it shipped — grouped by when, not tagged with invented version numbers.
          </p>
        </div>

        {/* Changelog Timeline */}
        <div className="max-w-3xl mx-auto px-6 space-y-12">
          {updates.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border/45 bg-muted/75 p-1 shadow-xs dark:border-border/65"
              >
                <div className="p-8 rounded-xl border border-border/75 bg-card space-y-6">

                  {/* Title & period info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">{item.period}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border/30">
                            {item.badge}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mt-1">{item.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Bullet points list */}
                  <ul className="space-y-3">
                    {item.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>

                </div>
              </div>
            );
          })}
        </div>

      </main>

      <MainFooter />
    </div>
  );
}
