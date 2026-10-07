"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon as Shield, Download01Icon as Download, EyeIcon as Eye } from "@hugeicons/core-free-icons";

const policies = [
  {
    title: "Private by default",
    desc: "Your memories aren't public. We do not sell your personal data or saved knowledge.",
    icon: Shield,
  },
  {
    title: "Your data",
    desc: "Export your memories or delete your account at any time. Your data remains fully under your ownership.",
    icon: Download,
  },
  {
    title: "Transparent AI",
    desc: "AI processes your saved information locally or in secure silos to help you locate and summarize context.",
    icon: Eye,
  },
];

export default function PrivacySection() {
  return (
    <section className="relative w-full py-20 bg-background overflow-hidden border-t border-border/20">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            PRIVACY
          </span>
          <h2 className="mt-6 font-medium text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            Your memories are yours.
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            Savedly is built around your personal knowledge. You control what you save, what you share, and what you delete.
          </p>
        </div>

        {/* Minimal 3 Column Grid (Double Bordered Cards!) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {policies.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div 
                key={idx}
                className="rounded-xl border border-border/45 bg-muted/75 p-1 shadow-xs dark:border-border/65"
              >
                <div className="p-5 rounded-lg border border-border/75 bg-card flex flex-col justify-between h-full">
                  <div>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
