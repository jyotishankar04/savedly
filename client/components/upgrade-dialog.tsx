"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { TIER_MARK, formatPerMonth } from "@/components/marketing/pricing-plans";
import { useMyPlanQuery } from "@/hooks/use-plan-limit";
import { getServerConfig } from "@/lib/server-config";
import { PLAN_TIER_TAGLINE, formatLimitValue, listPublicPlans, planFeatureBullets, planTier, startCheckout, type PlanLimitType, type PublicPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * "Select your plan": a full-screen dialog over the app, opened from the
 * sidebar's Upgrade now (openUpgradeDialog), in the manner of ChatGPT's and
 * Perplexity's. It lists the paid plans from the server with a monthly /
 * yearly switch, and a plan's button goes straight to checkout, so there's no
 * stop at the Billing page on the way. Mounted once in the app layout, so it
 * opens from anywhere, the phone menu included.
 */

const listeners = new Set<() => void>();
let isOpen = false;
const setOpen = (next: boolean) => {
  isOpen = next;
  listeners.forEach((listener) => listener());
};

export function openUpgradeDialog() {
  setOpen(true);
}

/** The limits worth calling out on a plan card, in this order, with how each reads. */
const HIGHLIGHTS: { type: PlanLimitType; unlimited: string; label: (value: string) => string }[] = [
  { type: "ai_monthly_saves", unlimited: "Unlimited AI saves", label: (v) => `${v} AI saves a month` },
  { type: "ai_monthly_queries", unlimited: "Unlimited Ask questions", label: (v) => `${v} Ask questions a month` },
  { type: "storage_mb", unlimited: "Unlimited storage", label: (v) => `${v} of storage` },
  { type: "memory_count", unlimited: "Unlimited memories", label: (v) => `Up to ${v} memories` },
];

export function UpgradeDialog() {
  const open = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => isOpen,
    () => false,
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 overflow-y-auto overscroll-contain outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-[0.99] data-ending-style:opacity-0 data-starting-style:scale-[0.99] data-starting-style:opacity-0">
          {open && <PlanPicker onClose={() => setOpen(false)} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PlanPicker({ onClose }: { onClose: () => void }) {
  const { data: plans, isLoading } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans });
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const { data: myPlan } = useMyPlanQuery();
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [pending, setPending] = useState<string | null>(null);

  const { free, cards, hasYearly, savingPct } = useMemo(() => {
    const all = plans ?? [];
    const paid = all.filter((p) => !p.isDefault && p.priceMinor > 0);
    const tiers = [...new Set(paid.map((p) => planTier(p.key)))];
    const savings = tiers
      .map((tier) => {
        const m = paid.find((p) => planTier(p.key) === tier && p.billingInterval === "monthly");
        const y = paid.find((p) => planTier(p.key) === tier && p.billingInterval === "yearly");
        return m && y ? Math.round((1 - y.priceMinor / (m.priceMinor * 12)) * 100) : 0;
      })
      .filter((pct) => pct > 0);
    return {
      free: all.find((p) => p.isDefault) ?? null,
      hasYearly: paid.some((p) => p.billingInterval === "yearly"),
      savingPct: savings.length ? Math.max(...savings) : 0,
      cards: tiers.map((tier) => {
        const variants = paid.filter((p) => planTier(p.key) === tier);
        return variants.find((p) => p.billingInterval === interval) ?? variants[0];
      }),
    };
  }, [plans, interval]);

  // Someone already paying changes plan in Billing, where the exact charge is
  // shown before it's made. (The sidebar's card only shows on Free.)
  const alreadyPaying = Boolean(myPlan && !myPlan.plan.isDefault);

  async function buy(plan: PublicPlan) {
    setPending(plan.key);
    try {
      window.location.assign(await startCheckout(plan.key));
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't start checkout.", type: "error" });
      setPending(null);
    }
  }

  return (
    <div className="relative min-h-full bg-background">
      {/* The same soft top light as the app behind it. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%)]" />

      <DialogPrimitive.Close
        aria-label="Close"
        className="fixed top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-[var(--hover)] hover:text-foreground sm:top-5 sm:right-5"
      >
        <HugeiconsIcon icon={Close} strokeWidth={2} className="h-4 w-4" />
      </DialogPrimitive.Close>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pt-16 pb-14 sm:pt-20">
        <DialogPrimitive.Title className="text-center font-serif text-[clamp(2rem,4vw,2.75rem)] leading-tight tracking-[-0.02em] text-foreground">
          Select your plan
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-3 max-w-md text-center text-[15px] text-pretty text-muted-foreground">
          More AI each month, more room, and the features that come with it. Cancel any time.
        </DialogPrimitive.Description>

        {hasYearly && (
          <div className="mt-7 flex flex-col items-center gap-2">
            <SegmentedControl
              label="Billing"
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly", accessory: savingPct > 0 ? <span className="text-xs font-medium text-primary">−{savingPct}%</span> : undefined },
              ]}
              value={interval}
              onValueChange={(value) => setInterval(value as "monthly" | "yearly")}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[24rem] items-center justify-center text-muted-foreground">
            <Spinner />
          </div>
        ) : cards.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">Paid plans aren&apos;t available right now.</p>
        ) : (
          <div className={cn("mt-8 grid w-full gap-4", cards.length > 1 && "md:grid-cols-2")}>
            {cards.map((plan, i) => {
              const tier = planTier(plan.key);
              const mark = TIER_MARK[tier];
              const recommended = i === 0 && cards.length > 1;
              const { price, per, note } = formatPerMonth(plan);
              const below = i === 0 ? free : cards[i - 1];
              const highlights = HIGHLIGHTS.map((h) => {
                const value = plan.limits[h.type];
                return value == null ? h.unlimited : h.label(formatLimitValue(h.type, value));
              });
              const bullets = planFeatureBullets(plan.features, below?.features);
              const canBuy = !!config?.billing && !alreadyPaying;
              return (
                <div
                  key={plan.key}
                  className={cn(
                    "relative flex flex-col rounded-3xl bg-card p-6 sm:p-7",
                    recommended ? "ring-1 ring-primary/50 " : "ring-1 ring-foreground/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {mark && <HugeiconsIcon icon={mark.icon} strokeWidth={2} className={cn("h-[18px] w-[18px]", mark.tint)} />}
                    <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
                    {recommended && <span className="ml-auto rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/25">Recommended</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{PLAN_TIER_TAGLINE[tier] ?? plan.description}</p>

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-[-0.03em] text-foreground">{price}</span>
                    {per && <span className="text-sm text-muted-foreground">{per}</span>}
                  </p>
                  <p className="mt-1 h-5 text-sm text-muted-foreground">{note}</p>

                  {/* The button under the price, so it's in view without scrolling. */}
                  {alreadyPaying ? (
                    <Link
                      href="/app/settings/billing"
                      onClick={onClose}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-foreground/[0.06] text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/10"
                    >
                      Change plan in Billing
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => buy(plan)}
                      disabled={pending !== null || !canBuy}
                      className={cn(
                        "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-colors disabled:opacity-60",
                        recommended ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10",
                      )}
                    >
                      {pending === plan.key && <Spinner />}
                      {canBuy ? `Get ${plan.name}` : "Coming soon"}
                    </button>
                  )}

                  <div className="mt-6 flex-1 border-t border-foreground/10 pt-5">
                    <p className="mb-3 text-sm text-muted-foreground">Everything in {below?.name ?? "Free"} and:</p>
                    <ul className="space-y-2.5">
                      {highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-primary">
                          <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0" />
                          {item}
                        </li>
                      ))}
                      {bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                          <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 max-w-lg text-center text-[13px] leading-relaxed text-muted-foreground">
          Payments by Dodo Payments; prices include tax. Cancel any time from Settings.{" "}
          <Link href="/pricing" onClick={onClose} className="text-foreground underline underline-offset-4 hover:text-primary">
            Compare every plan
          </Link>
        </p>
      </div>
    </div>
  );
}
