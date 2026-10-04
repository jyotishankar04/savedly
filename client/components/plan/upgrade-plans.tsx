"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  formatLimitValue,
  formatPriceMinor,
  planFeatureBullets,
  planTier,
  PLAN_TIER_TAGLINE,
  type Plan,
  type PublicPlan,
} from "@/lib/plans";

type Interval = "monthly" | "yearly";

const MAX_BULLETS = 5;

/**
 * Settings -> Plan & usage: the plans someone can move up to, one card per
 * tier with a monthly/yearly switch. `options` is already filtered to plans
 * above the current one (upgradeOptions), so every card is a real upgrade.
 */
export function UpgradePlans({
  current,
  options,
  pending,
  onChoose,
}: {
  current: Plan | null | undefined;
  options: PublicPlan[];
  pending: string | null;
  onChoose: (plan: PublicPlan) => void;
}) {
  const hasMonthly = options.some((p) => p.billingInterval === "monthly");
  const hasYearly = options.some((p) => p.billingInterval === "yearly");
  // Someone paying monthly looks at yearly first: that's their move up.
  const [choice, setChoice] = useState<Interval | null>(null);
  const interval: Interval = choice ?? (hasMonthly && !(current && !current.isDefault && current.billingInterval === "monthly") ? "monthly" : "yearly");

  const cards = useMemo(() => {
    const tiers = [...new Set(options.map((p) => planTier(p.key)))];
    return tiers.map((tier) => {
      const variants = options.filter((p) => planTier(p.key) === tier);
      const plan = variants.find((p) => p.billingInterval === interval) ?? variants[0];
      const monthly = variants.find((p) => p.billingInterval === "monthly");
      const yearly = variants.find((p) => p.billingInterval === "yearly");
      const saving =
        monthly && yearly && monthly.priceMinor > 0 ? Math.round((1 - yearly.priceMinor / (monthly.priceMinor * 12)) * 100) : 0;
      return { tier, plan, saving };
    });
  }, [options, interval]);

  const bestSaving = Math.max(0, ...cards.map((c) => c.saving));
  const topTier = cards[cards.length - 1]?.tier;

  return (
    <div className="space-y-4">
      {hasMonthly && hasYearly && (
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-muted p-0.5">
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={interval === value}
                onClick={() => setChoice(value)}
                className={cn(
                  "h-7 rounded-full px-3.5 text-[10px] font-bold transition-colors",
                  interval === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          {bestSaving > 0 && (
            <span className="text-[10px] font-semibold text-primary">Save up to {bestSaving}% yearly</span>
          )}
        </div>
      )}

      <div className={cn("grid gap-3", cards.length > 1 && "sm:grid-cols-2")}>
        {cards.map(({ tier, plan, saving }, i) => {
          const highlighted = cards.length > 1 && tier === topTier;
          // Each card builds on the one before it (Pro on Lite), or on the current plan.
          const below = i > 0 ? cards[i - 1].plan : null;
          const bullets = cardBullets(plan, below ?? current, below?.name ?? null);
          const yearly = plan.billingInterval === "yearly";
          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-xl border p-5 transition-colors",
                highlighted ? "border-primary/40 bg-primary/[0.03] ring-1 ring-primary/15" : "border-border bg-background/40",
              )}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{plan.name}</p>
                {highlighted && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                    Most room
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{PLAN_TIER_TAGLINE[tier] ?? plan.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {formatPriceMinor(plan.priceMinor, plan.currency)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{yearly ? "/ year" : "/ month"}</span>
              </div>
              <p className="mt-0.5 h-4 text-[10px] font-medium text-muted-foreground">
                {yearly
                  ? `${formatPriceMinor(Math.round(plan.priceMinor / 12), plan.currency)} a month${saving > 0 ? `, ${saving}% less than monthly` : ""}`
                  : ""}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {bullets.shown.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] font-medium text-foreground">
                    <HugeiconsIcon icon={Tick} strokeWidth={2.5} className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
                {bullets.more > 0 && (
                  <li className="pl-5.5 text-[10px] font-medium text-muted-foreground">
                    and {bullets.more} more, see <a href="/pricing" className="text-primary hover:underline">all plans</a>
                  </li>
                )}
              </ul>

              <button
                type="button"
                onClick={() => onChoose(plan)}
                disabled={pending !== null}
                className={cn(
                  "mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50",
                  highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border text-foreground hover:bg-muted",
                )}
              >
                {pending === plan.key && <Spinner />}
                Upgrade to {plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Room and AI first, then what it unlocks over the current plan. */
function cardBullets(plan: PublicPlan, base: Plan | null | undefined, baseName: string | null): { shown: string[]; more: number } {
  const { limits } = plan;
  const room: string[] = baseName ? [`Everything in ${baseName}`] : [];
  if (limits.storage_mb !== undefined) {
    room.push(limits.storage_mb === null ? "Unlimited storage" : `${formatLimitValue("storage_mb", limits.storage_mb)} of storage`);
  }
  if (limits.ai_monthly_saves !== undefined) {
    room.push(
      limits.ai_monthly_saves === null
        ? "Unlimited AI processing"
        : `AI processing for ${limits.ai_monthly_saves.toLocaleString("en-US")} saves a month`,
    );
  }
  if (limits.ai_monthly_queries !== undefined) {
    room.push(
      limits.ai_monthly_queries === null
        ? "Unlimited Ask questions"
        : `${limits.ai_monthly_queries.toLocaleString("en-US")} Ask questions a month`,
    );
  }
  const all = [...room, ...planFeatureBullets(plan.features, base?.features)];
  return { shown: all.slice(0, MAX_BULLETS), more: Math.max(0, all.length - MAX_BULLETS) };
}
