"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { label: "Account", href: "/app/settings" },
    { label: "Appearance", href: "/app/settings/appearance" },
    { label: "Capture", href: "/app/settings/capture" },
    { label: "AI Features", href: "/app/settings/ai" },
    { label: "Notifications", href: "/app/settings/notifications" },
    { label: "Privacy & Data", href: "/app/settings/privacy" },
    { label: "Plan & usage", href: "/app/settings/billing" },
    { label: "Help", href: "/app/settings/help" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Configure profile details, capture extension sync, your plan and usage, and AI keys.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Settings Sub-Sidebar */}
        <aside className="w-full md:w-48 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none font-semibold text-xs text-muted-foreground">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-lg transition-all text-nowrap",
                  active 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </aside>

        {/* Nested settings content panel */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>

    </div>
  );
}
