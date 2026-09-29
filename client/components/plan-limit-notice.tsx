"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CrownIcon as Crown, Alert02Icon as AlertCircle } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** Inline "you've hit your plan limit" banner — same copy the server would throw, plus a link to the plan the user can already see (no live upgrade flow exists yet, matching settings/billing's "Coming soon" state). */
export function PlanLimitNotice({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <HugeiconsIcon icon={AlertCircle} strokeWidth={2.25} className="h-3.5 w-3.5 shrink-0" />
      <span className="leading-snug">{message}</span>
      <Link
        href="/app/settings/billing"
        className="ml-auto shrink-0 flex items-center gap-1 underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300"
      >
        <HugeiconsIcon icon={Crown} strokeWidth={2.25} className="h-3 w-3" />
        View plan
      </Link>
    </div>
  );
}

/**
 * Small overlay dot for an icon-only trigger button that opens a form
 * gated elsewhere (e.g. the sidebar's Quick Capture FAB, which just opens
 * the modal where the real disabled-Save-button gate already lives) — a
 * heads-up before the click, not a block on the click itself.
 */
export function LimitDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--background)]",
        className,
      )}
    />
  );
}

/** Small pill marking an action as gated by plan limits — sits next to a disabled button's label. */
/** A small plan tag ("Pro" by default) on something the current plan doesn't include. */
export function ProBadge({ className, label = "Pro" }: { className?: string; label?: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shrink-0",
        className,
      )}
    >
      <HugeiconsIcon icon={Crown} strokeWidth={2.5} className="h-2.5 w-2.5" />
      {label ?? "Pro"}
    </span>
  );
}
