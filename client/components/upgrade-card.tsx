"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, FlashIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useMyPlanQuery, usePlanLimit } from "@/hooks/use-plan-limit";
import { formatPriceMinor, listPublicPlans, type PlanLimitType } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { openUpgradeDialog } from "@/components/upgrade-dialog";

/**
 * The upgrade prompt at the foot of the app's sidebar, for people on the Free
 * plan of the hosted service (never on a paid plan or a self-hosted install,
 * which has no plans).
 *
 * Open, it's a card in the accent colour above the account button: Upgrade to
 * the cheapest paid monthly plan, this month's AI saves and Ask questions
 * against the Free allowance, the price, and Upgrade now. Plan, price and
 * numbers are read live, so none goes stale when an admin changes the plans.
 * Closed, the card sinks into the account button, which keeps a primary ring
 * and a small Upgrade badge on its top edge (UpgradeRing); the badge opens the
 * card again. On a phone, where the account sits at the top of the menu, the
 * badge goes beside the plan name instead (UpgradeBadge).
 *
 * Open or folded is remembered in this browser only, and shared by every
 * piece here through one small store.
 */
const STORAGE_KEY = "sfl:upgrade-card-folded";

const listeners = new Set<() => void>();
let folded: boolean | null = null;

function readFolded(): boolean {
  if (folded === null) {
    try {
      folded = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      folded = false;
    }
  }
  return folded;
}

function setFolded(next: boolean) {
  folded = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Only this visit remembers it.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** null on the server and before the plan loads; otherwise whether to prompt, and how. */
function useUpgradePrompt(): { folded: boolean } | null {
  const { data } = useMyPlanQuery();
  const isFolded = useSyncExternalStore(subscribe, readFolded, () => null);
  if (isFolded === null || !data || data.selfHosted || data.plan.key !== "free") return null;
  return { folded: isFolded };
}

/** The allowances reset with the calendar month (startOfCurrentMonth in the server's plans.service.ts). */
function resetLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The cheapest paid monthly plan on sale, for "Upgrade to Lite · $5/month". */
function useEntryPlan() {
  const { data } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  return data
    ?.filter((plan) => plan.billingInterval === "monthly" && plan.priceMinor > 0)
    .sort((a, b) => a.priceMinor - b.priceMinor)[0];
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

const EASE = [0.32, 0.72, 0, 1] as const;

export function UpgradeCard({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const prompt = useUpgradePrompt();
  const entry = useEntryPlan();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {prompt && !prompt.folded && (
        <motion.div
          key="upgrade-card"
          // Grows up out of the account button, and sinks back into it.
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.9, height: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, height: "auto" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 36, scale: 0.86, height: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.5, ease: EASE }}
          style={{ transformOrigin: "50% 100%" }}
          className="overflow-hidden"
        >
          <div className={className}>
            <div className="relative isolate overflow-hidden rounded-xl bg-primary p-4 text-primary-foreground">
              {/* A little light from the top corner, so the colour isn't flat. */}
              <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 -z-10 h-44 w-44 rounded-full bg-white/20 blur-3xl" />

              <button
                type="button"
                onClick={() => setFolded(true)}
                aria-label="Hide"
                className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <HugeiconsIcon icon={Close} strokeWidth={2} className="h-3.5 w-3.5" />
              </button>

              <HugeiconsIcon icon={FlashIcon} strokeWidth={2} className="h-5 w-5" />

              <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em]">Upgrade to {entry?.name ?? "a paid plan"}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-primary-foreground/80">
                More AI each month, more storage and the private vault.
              </p>

              <div className="mt-3.5 space-y-2.5">
                <Meter type="ai_monthly_saves" label="AI saves" />
                <Meter type="ai_monthly_queries" label="Ask questions" />
                <p className="text-[10px] text-primary-foreground/60">Resets {resetLabel()}</p>
              </div>

              {entry && (
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-[24px] font-semibold leading-none tracking-[-0.02em]">{formatPriceMinor(entry.priceMinor, entry.currency)}</span>
                  <span className="text-[12px] text-primary-foreground/70">/month</span>
                </p>
              )}

              {/* Opens the plan picker over the app (upgrade-dialog.tsx) rather
                  than leaving for the Billing page. */}
              <button
                type="button"
                onClick={() => {
                  onNavigate?.();
                  openUpgradeDialog();
                }}
                className="group mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-foreground/25 bg-primary-foreground/15 text-[13px] font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary-foreground/25 active:scale-[0.98]"
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
                Upgrade now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Wraps the account button: a primary ring and an Upgrade badge on its top edge while the card is folded. */
export function UpgradeRing({ children }: { children: ReactNode }) {
  const prompt = useUpgradePrompt();
  const reduced = useReducedMotion();
  const on = Boolean(prompt?.folded);

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-xl ring-primary transition-[box-shadow] duration-500",
          // Waits for the card to finish sinking before the ring lights.
          on ? "ring-[1.5px] delay-300" : "ring-0",
        )}
      >
        {children}
      </div>
      <AnimatePresence>
        {on && (
          <motion.button
            key="upgrade-badge"
            type="button"
            onClick={() => setFolded(false)}
            aria-label="Show upgrade options"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.85, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: EASE, delay: reduced ? 0 : 0.35 }}
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

/** The folded badge on its own, for where there's no account button to ring (the phone menu's header). */
export function UpgradeBadge({ className }: { className?: string }) {
  const prompt = useUpgradePrompt();
  if (!prompt?.folded) return null;
  return (
    <button
      type="button"
      onClick={() => setFolded(false)}
      aria-label="Show upgrade options"
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full bg-primary px-2 text-[10px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
        className,
      )}
    >
      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2.25} className="h-2.5 w-2.5" />
      Upgrade
    </button>
  );
}
