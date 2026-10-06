"use client";

import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HugeiconsIcon } from "@hugeicons/react";
import { UsersIcon as Users, MessageSquareIcon as MessageSquare, CodeIcon as Code, HelpCircleIcon as HelpCircle, ArrowUpRight01Icon as ArrowUpRight } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

// A card without an href isn't open yet, and shows as "coming soon".
const communityLinks: { title: string; desc: string; icon: typeof Users; cta: string; href?: string }[] = [
  { title: "Join the Discord server", desc: "Ask questions, get help with the hosted app or your own install, and suggest ideas.", icon: MessageSquare, cta: "Open Discord", href: "https://discord.gg/PzGFcMNyRK" },
  { title: "GitHub", desc: "Read the code, report a bug, or pick up an issue. SaveForLatter is open source under AGPL-3.0.", icon: Code, cta: "Open GitHub", href: "https://github.com/jyotishankar04/saveforlatter" },
  { title: "Twitter / X Community", desc: "Follow product update logs, feature announcements, user stories, and productivity advice.", icon: Users, cta: "Follow updates" },
  { title: "Community Showcase", desc: "Share your own personal curation workflows, browser extensions setup, and capture collections.", icon: HelpCircle, cta: "See showcase" },
];

export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20">
        
        {/* Header */}
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4 mb-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Connect
          </span>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
            Join the Community.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Connect with other researchers, developers, and writers designing clean workflows to capture and search digital memory.
          </p>
        </div>

        {/* Community List (Double Bordered Cards!) */}
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-border/45 bg-muted/75 p-1 shadow-xs dark:border-border/65 hover:border-primary/20 transition-all duration-300"
              >
                <div className="p-6 rounded-xl border border-border/75 bg-card flex flex-col justify-between h-full group">
                  <div className="space-y-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary w-fit">
                      <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-5 w-5" />
                    </div>
                    
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 flex h-10 w-full items-center justify-center gap-1 rounded-full border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {item.cta} <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2.25} className="h-4 w-4" />
                    </a>
                  ) : (
                    <Button
                      disabled
                      title="Coming soon"
                      aria-label={`${item.cta} — coming soon`}
                      className="mt-6 w-full h-10 rounded-full font-semibold flex items-center justify-center gap-1 opacity-60 cursor-not-allowed"
                      variant="outline"
                    >
                      {item.cta} <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2.25} className="h-4 w-4" />
                    </Button>
                  )}
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
