"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, SparklesIcon } from "@hugeicons/core-free-icons";
import { useMyPlanQuery, usePlanLimit } from "@/hooks/use-plan-limit";
import { cn } from "@/lib/utils";

/**
 * The upgrade prompt at the foot of the app's sidebar, for people on the Free
 * plan of the hosted service (never on a paid plan or a self-hosted install,
 * which has no plans).
 *
 * Open, it's a card above the account button: what paid plans add, this
 * month's AI saves against the Free allowance (read live from the plan, so no
 * number here goes stale), and Upgrade. Closed, the card sinks into the
 * account button, which keeps a primary ring and a small Upgrade badge on its
 * top edge (UpgradeRing); the badge opens the card again. On a phone, where
 * the account sits at the top of the menu, the badge goes beside the plan
 * name instead (UpgradeBadge).
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

const EASE = [0.32, 0.72, 0, 1] as const;

export function UpgradeCard({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const prompt = useUpgradePrompt();
  const aiSaves = usePlanLimit("ai_monthly_saves");
  const reduced = useReducedMotion();

  const showMeter = aiSaves.limit != null && aiSaves.limit > 0;
  const share = showMeter ? Math.min(aiSaves.used / aiSaves.limit!, 1) : 0;

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
          <div className={cn("relative rounded-xl border border-primary/20 bg-primary/[0.06] p-3", className)}>
            <button
              type="button"
              onClick={() => setFolded(true)}
              aria-label="Hide"
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <HugeiconsIcon icon={Close} strokeWidth={2} className="h-3 w-3" />
            </button>

            <div className="flex items-center gap-1.5 pr-6 text-[13px] font-medium text-foreground">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="h-3.5 w-3.5 text-primary" />
              Get more from Savedly
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Unlimited memories, more AI each month, more storage and the private vault.
            </p>

            {showMeter && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>AI saves this month</span>
                  <span className="tabular-nums">
                    {aiSaves.used} / {aiSaves.limit}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", share >= 0.9 ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${Math.max(share * 100, 2)}%` }}
                  />
                </div>
              </div>
            )}

            <Link
              href="/app/settings/billing"
              onClick={onNavigate}
              className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-primary text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upgrade
            </Link>
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
