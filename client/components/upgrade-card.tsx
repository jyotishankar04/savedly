"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlashIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { useQuery } from "@tanstack/react-query";
import { useMyPlanQuery, usePlanLimit } from "@/hooks/use-plan-limit";
import { formatPriceMinor, listPublicPlans, type PlanLimitType } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The plan and upgrade pieces of the account menu, at the foot of the app's
 * sidebar (and in the phone menu).
 *
 * For people on the hosted Free plan (never on a paid plan or a self-hosted
 * install, which has no plans) the account button wears a primary ring and an
 * Upgrade badge (UpgradeRing), and the menu it opens starts with this month's
 * AI saves and Ask questions against the allowance, and Upgrade (PlanUsage).
 * The numbers are read live from the plan, so none goes stale when an admin
 * changes the plans. Everyone gets the Dark / Light / System switch
 * (ThemeSwitch).
 */

function useIsFreeHosted(): boolean {
  const { data } = useMyPlanQuery();
  return Boolean(data && !data.selfHosted && data.plan.key === "free");
}

/** The allowances reset with the calendar month (startOfCurrentMonth in the server's plans.service.ts). */
function resetLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Meter({ type, label }: { type: PlanLimitType; label: string }) {
  const status = usePlanLimit(type);
  if (status.limit == null || status.limit <= 0) return null;
  const share = Math.min(status.used / status.limit, 1);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] text-primary-foreground/75">
        <span>{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold text-primary-foreground">{status.used}</span> / {status.limit}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-primary-foreground/20">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", share >= 0.9 ? "bg-amber-300" : "bg-primary-foreground")}
          style={{ width: `${Math.max(share * 100, 3)}%` }}
        />
      </div>
    </div>
  );
}

/** The cheapest paid monthly plan on sale, for "Upgrade to Lite · $5/month". Live, so it follows the admin's prices. */
function useEntryPlan() {
  const { data } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  return data
    ?.filter((plan) => plan.billingInterval === "monthly" && plan.priceMinor > 0)
    .sort((a, b) => a.priceMinor - b.priceMinor)[0];
}

export function PlanUsage({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const entry = useEntryPlan();
  if (!useIsFreeHosted()) return null;
  return (
    <div className={cn("relative isolate overflow-hidden rounded-xl bg-primary p-4 text-primary-foreground shadow-[0_10px_30px_-12px_color-mix(in_oklch,var(--primary)_80%,transparent)]", className)}>
      {/* A little light from the top corner, so the colour isn't flat. */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 -z-10 h-44 w-44 rounded-full bg-white/20 blur-3xl" />

      <div className="flex items-start justify-between gap-2">
        <HugeiconsIcon icon={FlashIcon} strokeWidth={2} className="h-5 w-5" />
        <span className="text-[11px] text-primary-foreground/70">Resets {resetLabel()}</span>
      </div>

      <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em]">Upgrade to {entry?.name ?? "a paid plan"}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-primary-foreground/80">
        More AI each month, more storage and the private vault.
      </p>

      <div className="mt-3.5 space-y-2.5">
        <Meter type="ai_monthly_saves" label="AI saves" />
        <Meter type="ai_monthly_queries" label="Ask questions" />
      </div>

      {entry && (
        <p className="mt-4 flex items-baseline gap-1">
          <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{formatPriceMinor(entry.priceMinor, entry.currency)}</span>
          <span className="text-[12px] text-primary-foreground/70">/month</span>
        </p>
      )}

      <Link
        href="/app/settings/billing"
        onClick={onNavigate}
        className="group mt-3.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-foreground/25 bg-primary-foreground/15 text-[13px] font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary-foreground/25 active:scale-[0.98]"
      >
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
        Upgrade now
      </Link>
    </div>
  );
}

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedControl
      label="Theme"
      options={THEMES}
      value={theme ?? "system"}
      onValueChange={setTheme}
      className={cn("w-full [&>div]:flex-1! [&_button]:flex-1!", className)}
    />
  );
}

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Wraps the account button. For Free users: a primary ring, and an Upgrade
 * badge on its top edge that opens the account menu (where the upgrade is).
 * The badge steps aside while the menu is open.
 */
export function UpgradeRing({ children, menuOpen, onOpenMenu }: { children: ReactNode; menuOpen: boolean; onOpenMenu: () => void }) {
  const on = useIsFreeHosted();
  const reduced = useReducedMotion();

  return (
    <div className="relative">
      <div className={cn("rounded-xl ring-primary transition-[box-shadow] duration-500", on ? "ring-[1.5px]" : "ring-0")}>{children}</div>
      <AnimatePresence>
        {on && !menuOpen && (
          <motion.button
            key="upgrade-badge"
            type="button"
            onClick={onOpenMenu}
            aria-label="Upgrade your plan"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.85, transition: { duration: 0.12 } }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute -top-2.5 right-3 z-[1] inline-flex h-5 items-center gap-1 rounded-full bg-primary px-2 text-[10px] font-semibold text-primary-foreground shadow-sm ring-2 ring-card transition-colors hover:bg-primary/90"
          >
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2.25} className="h-2.5 w-2.5" />
            Upgrade
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
