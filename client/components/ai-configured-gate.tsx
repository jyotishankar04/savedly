"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon as Key, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AI_STATUS_QUERY_KEY, getAiStatus, type AiStatus } from "@/lib/ai-settings";
import { cn } from "@/lib/utils";

/**
 * Gates an AI feature (Ask chat, the floating widget) on Ask actually being
 * able to answer: the user's own reasoning key, or included AI with
 * questions left this month (see server ai-settings.service.ts getAiStatus).
 *
 * Blurs and disables `children` rather than hiding them, so the real UI's
 * shape stays visible underneath, with a card explaining what's needed.
 */
export function AiConfiguredGate({ children, className }: { children: React.ReactNode; className?: string }) {
  const { data: status, isLoading } = useQuery({ queryKey: AI_STATUS_QUERY_KEY, queryFn: getAiStatus });

  // Render normally until we know, rather than flashing a blurred screen.
  if (isLoading || !status || status.askAvailable) return <>{children}</>;

  const card = gateCopy(status);

  return (
    <div className={cn("relative h-full min-h-0", className)}>
      <div className="h-full blur-sm pointer-events-none select-none opacity-60" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/40">
        <div className="max-w-xs w-full rounded-2xl border border-border bg-card shadow-xl p-6 text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <HugeiconsIcon icon={Key} strokeWidth={2.25} className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{card.body}</p>
          </div>
          {card.action && (
            <Button render={<Link href={card.action.href} />} nativeButton={false} className="w-full rounded-full gap-1.5">
              {card.action.label}
              <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function gateCopy(status: AiStatus): { title: string; body: string; action: { label: string; href: string } | null } {
  if (status.mode === "managed") {
    if (!status.includedReady) {
      return {
        title: "AI is being set up",
        body: "AI is included in your plan, but it isn't available on this server yet. Please try again a little later.",
        action: null,
      };
    }
    return {
      title: "This month's questions are used up",
      body: "Your plan's included questions reset at the start of next month. A bigger plan includes more.",
      action: { label: "See plans", href: "/app/settings/billing" },
    };
  }
  if (status.askBlockedReason === "included-used-up") {
    return {
      title: "This month's free questions are used up",
      body: "Add your own AI key to keep asking right away, with no limits, or move to a plan with AI included.",
      action: { label: "Add an AI key", href: "/app/settings/ai" },
    };
  }
  return {
    title: "Connect an AI key to use Ask",
    body: "Bring your own key from OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible service. It's used only for your account. Or pick a plan with AI included.",
    action: { label: "Configure AI", href: "/app/settings/ai" },
  };
}
