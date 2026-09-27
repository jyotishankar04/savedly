"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Calendar03Icon as CalendarIcon,
  Search01Icon as Search,
  SparklesIcon as Sparkles,
  HelpCircleIcon as Help,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

// One of each thing Ask can do: recall by time, find by topic, summarize,
// and answer questions about the app itself.
const SUGGESTIONS: { icon: IconSvgElement; prompt: string }[] = [
  { icon: CalendarIcon, prompt: "What did I save this week?" },
  { icon: Search, prompt: "Find what I saved about AI agents" },
  { icon: Sparkles, prompt: "Summarize my most recent saves" },
  { icon: Help, prompt: "How does the vault work?" },
];

/** First screen of a conversation: what Ask is for, and prompts that send on click. */
export function AskEmptyState({
  onPick,
  disabled = false,
  compact = false,
}: {
  onPick: (prompt: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("mx-auto w-full", compact ? "py-2" : "max-w-2xl py-12 md:py-20")} data-tour="ask-header">
      {/* The popup's header already carries this mark. */}
      {!compact && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LogoMark ticks={false} className="h-9 w-9" />
        </div>
      )}
      <h2 className={cn("font-medium tracking-tight text-foreground text-balance", compact ? "text-lg" : "mt-5 text-2xl md:text-3xl")}>
        What do you want to find?
      </h2>
      <p className={cn("mt-2 text-muted-foreground leading-relaxed", compact ? "text-sm" : "text-[15px] max-w-lg")}>
        Ask about anything you&apos;ve saved, or ask me to save, edit, or organize something.
      </p>

      <div className={cn("grid gap-2", compact ? "mt-4 grid-cols-1" : "mt-6 sm:grid-cols-2")}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border bg-card/60 text-left text-foreground transition-colors",
              "hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50",
              compact ? "px-3 py-2.5 text-[13px]" : "px-4 py-3 text-sm",
            )}
          >
            <HugeiconsIcon icon={s.icon} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="min-w-0">{s.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
