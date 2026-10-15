"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, SparklesIcon } from "@hugeicons/core-free-icons";
import { useMyPlanQuery, usePlanLimit } from "@/hooks/use-plan-limit";
import { cn } from "@/lib/utils";

/**
 * The upgrade card above the account button at the foot of the app's sidebar,
 * for people on the Free plan of the hosted service (never on a self-hosted
 * install, which has no plans). It shows this month's AI saves against the
 * Free allowance, the limit people reach first, read live from the plan so
 * no number here goes stale when an admin changes the plans.
 *
 * The close button folds it into a small Upgrade badge in the same place;
 * clicking the badge opens the card again. Which one shows is remembered in
 * this browser only.
 */
const STORAGE_KEY = "sfl:upgrade-card-folded";

export function UpgradeCard({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data } = useMyPlanQuery();
  const aiSaves = usePlanLimit("ai_monthly_saves");
  // null until browser storage has been read, so neither form flashes.
  const [folded, setFolded] = useState<boolean | null>(null);

  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Blocked storage: show the card.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage, after mount
    setFolded(stored);
  }, []);

  if (!data || data.selfHosted || data.plan.key !== "free" || folded === null) return null;

  const fold = (next: boolean) => {
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Only this visit remembers it.
    }
    setFolded(next);
  };

  if (folded) {
    return (
      <div className={cn("flex", className)}>
        <button
          type="button"
          onClick={() => fold(false)}
          aria-label="Show upgrade options"
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-3 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="h-3 w-3" />
          Upgrade
        </button>
      </div>
    );
  }

  const showMeter = aiSaves.limit != null && aiSaves.limit > 0;
  const share = showMeter ? Math.min(aiSaves.used / aiSaves.limit!, 1) : 0;

  return (
    <div className={cn("relative rounded-xl border border-primary/20 bg-primary/[0.06] p-3", className)}>
      <button
        type="button"
        onClick={() => fold(true)}
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
  );
}
