"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, BookOpen01Icon as Book } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface HelpLink {
  label: string;
  href: string;
}

export interface PlatformHelpResult {
  topics: { slug: string; title: string; href: string; actions: HelpLink[] }[];
  tools: { title: string; href: string }[];
}

export const PLATFORM_HELP_TOOL = "get_platform_help";

/**
 * The links live in the tool message's artifact (the model only sees button
 * names, never paths), both in the live stream and in saved history.
 */
export function parsePlatformHelp(output: unknown): PlatformHelpResult | null {
  try {
    const data = (output as { kwargs?: { artifact?: unknown } })?.kwargs?.artifact as PlatformHelpResult | undefined;
    if (!data || !Array.isArray(data.topics)) return null;
    return { topics: data.topics, tools: Array.isArray(data.tools) ? data.tools : [] };
  } catch {
    return null;
  }
}

/** Every help result in a message, merged, so the same button never shows twice. */
export function collectHelpLinks(parts: { type: string; toolName?: string; state?: string; output?: unknown }[]) {
  const actions: HelpLink[] = [];
  const guides: HelpLink[] = [];
  const seen = new Set<string>();
  const add = (list: HelpLink[], link: HelpLink) => {
    if (seen.has(link.href)) return;
    seen.add(link.href);
    list.push(link);
  };
  for (const part of parts) {
    if (part.type !== "dynamic-tool" || part.toolName !== PLATFORM_HELP_TOOL || part.state !== "output-available") continue;
    const result = parsePlatformHelp(part.output);
    if (!result) continue;
    for (const topic of result.topics) {
      for (const action of topic.actions ?? []) add(actions, action);
      add(guides, { label: topic.title, href: topic.href });
    }
    for (const tool of result.tools) add(actions, { label: tool.title, href: tool.href });
  }
  return { actions, guides };
}

/**
 * The buttons under an Ask answer about the app itself: where to do the thing,
 * and the full guide. `compact` is the popup widget's size.
 */
export function HelpActions({
  parts,
  compact = false,
  onNavigate,
}: {
  parts: Parameters<typeof collectHelpLinks>[0];
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { actions, guides } = collectHelpLinks(parts);
  if (actions.length === 0 && guides.length === 0) return null;

  const size = compact ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact ? "pt-1" : "px-2.5 pt-1")}>
      {actions.map((action, i) => (
        <Link
          key={action.href}
          href={action.href}
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            size,
            i === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {action.label}
          {i === 0 && <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3.5 w-3.5" />}
        </Link>
      ))}
      {guides.map((guide) => (
        <Link
          key={guide.href}
          href={guide.href}
          target="_blank"
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            size,
          )}
        >
          <HugeiconsIcon icon={Book} strokeWidth={2} className="h-3.5 w-3.5" />
          Guide: {guide.label}
        </Link>
      ))}
    </div>
  );
}
