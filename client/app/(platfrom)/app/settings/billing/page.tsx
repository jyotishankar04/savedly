"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyPlan,
  formatLimitValue,
  LIMIT_ORDER,
  listPublicPlans,
  openBillingPortal,
  PLAN_LIMIT_LABEL,
  startCheckout,
  syncBilling,
  upgradeOptions,
  getBillingStatus,
  type Plan,
  type PlanLimitType,
} from "@/lib/plans";
import { getServerConfig } from "@/lib/server-config";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/query-error-state";
import { SupportProjectCard } from "@/components/support-project-card";
import { cn } from "@/lib/utils";
import { UpgradePlans } from "@/components/plan/upgrade-plans";
import { UpgradeConfirmDialog } from "@/components/plan/upgrade-confirm-dialog";

// Limits with no running total (a per-file cap) show the cap only.
const NO_USAGE: PlanLimitType[] = ["max_file_mb"];

export default function BillingSettingsPage() {
  // useSearchParams (the ?checkout= return) needs a Suspense boundary.
  return (
    <React.Suspense fallback={<p className="text-xs text-muted-foreground">Loading...</p>}>
      <BillingSettings />
    </React.Suspense>
  );
}

function BillingSettings() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plans", "me"],
    queryFn: getMyPlan,
  });
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const { data: plans } = useQuery({
    queryKey: ["plans", "public"],
    queryFn: listPublicPlans,
    enabled: !!config?.billing,
  });
  const [pending, setPending] = useState<string | null>(null);
  const { data: billing } = useQuery({
    queryKey: ["billing", "status"],
    queryFn: getBillingStatus,
    enabled: !!config?.billing && !!data && !data.selfHosted,
  });

  // Back from the provider's checkout. The webhook usually switches the plan
  // within seconds, but it can be late (or never come), so also ask the
  // server to read the subscription from the provider: now, then a couple of
  // times more while the payment settles.
  const checkout = searchParams.get("checkout");
  // A subscriber who clicked Upgrade on the pricing page lands here to confirm.
  const [confirmingPlan, setConfirmingPlan] = useState<string | null>(searchParams.get("upgrade"));
  useEffect(() => {
    if (checkout === "cancelled") {
      toast.add({ title: "Checkout cancelled. Nothing was charged." });
      return;
    }
    if (checkout !== "success") return;
    toast.add({ title: "Thanks! Your plan updates as soon as the payment is confirmed.", type: "success" });
    let cancelled = false;
    const timers = [0, 4000, 10000].map((delay) =>
      setTimeout(async () => {
        if (cancelled) return;
        try {
          await syncBilling();
        } catch {
          // The webhook still gets there; this is only a head start.
        }
        queryClient.invalidateQueries({ queryKey: ["plans", "me"] });
        queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
      }, delay),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [checkout, queryClient]);

  const go = async (key: string, fetchUrl: () => Promise<string>) => {
    setPending(key);
    try {
      window.location.assign(await fetchUrl());
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Something went wrong.", type: "error" });
      setPending(null);
    }
  };

  const onPaidPlan = !!data && !data.plan.isDefault;
  const sub = billing?.subscription ?? null;
  // Moving up changes an active subscription in place (the saved card is
  // charged, so it's confirmed first). Without one — no subscription, or a
  // cancelled one, which can't be changed — it's a new checkout.
  const inPlace = !!sub?.changeable;
  // Offer only what's above what they already have: the plan they're shown
  // (which may be an admin grant) or the one they still pay for, whichever
  // ranks higher. That's also what the server accepts.
  const paidPlan = sub ? (plans?.find((p) => p.key === sub.planKey) ?? null) : null;
  const floor: Plan | null | undefined = inPlace
    ? paidPlan
    : paidPlan && data && paidPlan.sortOrder > data.plan.sortOrder
      ? paidPlan
      : data?.plan;
  const upgrades = upgradeOptions(floor, plans ?? []);
  const until = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
  const source = data?.assignment?.source;
  const planNote = !data
    ? null
    : source === "admin_manual"
      ? `Set by an admin${data.assignment?.endsAt ? ` until ${until(data.assignment.endsAt)}` : ""}${sub ? `, then back to your paid ${sub.planName}` : ""}`
      : source === "subscription" && sub
        ? sub.status === "cancelled"
          ? `Cancelled · yours until ${until(sub.periodEnd)}`
          : sub.status === "past_due"
            ? `Payment failed · we'll keep trying until ${until(sub.periodEnd)}`
            : `Renews ${until(sub.periodEnd)}`
        : null;

  return (
    <div className="space-y-6 max-w-3xl text-xs font-semibold">
      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Plan & usage</h3>
        <p className="text-[10px] text-muted-foreground">
          {data?.selfHosted
            ? "This is your own install: every feature, with no limits."
            : "Plans differ in how much you can store, how much AI we supply each month, and which features they unlock."}
        </p>
      </div>

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="p-5 border border-border bg-card rounded-xl space-y-4">
            <div className="flex justify-between items-center gap-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Your plan</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{data.plan.name}</p>
              </div>
              {planNote && <span className="text-[10px] text-muted-foreground text-right">{planNote}</span>}
            </div>

            {data.plan.description && <p className="text-[11px] text-muted-foreground font-medium">{data.plan.description}</p>}

            <div className="space-y-3">
              {LIMIT_ORDER.filter((t) => t in data.limits).map((t) => (
                <UsageRow key={t} limitType={t} limit={data.limits[t] ?? null} used={data.usage[t] ?? 0} />
              ))}
            </div>

            {!data.selfHosted && (
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                {data.plan.features?.managedAi
                  ? "We run the AI for you, up to these monthly allowances. They reset on the 1st."
                  : "The AI allowances cover AI we supply. Add your own key in Settings > AI and your saves and questions are never limited."}
              </p>
            )}
          </div>

          {/* Only for someone who looks unpaid: no subscription, and no plan set by an admin. */}
          {config?.billing && !data.selfHosted && !onPaidPlan && !sub && source !== "admin_manual" && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Just paid and still see {data.plan.name}?{" "}
              <button
                type="button"
                disabled={pending !== null}
                onClick={async () => {
                  setPending("sync");
                  try {
                    const { applied } = await syncBilling();
                    await queryClient.invalidateQueries({ queryKey: ["plans", "me"] });
                    queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
        queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
                    if (!applied) toast.add({ title: "No active subscription found yet. It can take a minute after paying." });
                  } catch (err) {
                    toast.add({ title: err instanceof Error ? err.message : "Couldn't check right now.", type: "error" });
                  } finally {
                    setPending(null);
                  }
                }}
                className="font-bold text-primary hover:underline disabled:opacity-50"
              >
                {pending === "sync" ? "Checking…" : "Check again"}
              </button>
            </p>
          )}

          {config?.billing && !data.selfHosted && (
            <div className="p-5 border border-border bg-card rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  {upgrades.length ? (inPlace ? "Move up" : "Upgrade") : "Subscription"}
                </span>
                {sub && (
                  <button
                    type="button"
                    onClick={() => go("portal", openBillingPortal)}
                    disabled={pending !== null}
                    className="h-7 rounded-full border border-border text-foreground text-[10px] font-bold px-3.5 hover:bg-muted transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    {pending === "portal" && <Spinner />}
                    Manage billing
                  </button>
                )}
              </div>
              {upgrades.length > 0 ? (
                <UpgradePlans
                  current={floor}
                  options={upgrades}
                  pending={pending}
                  onChoose={(plan) =>
                    // Someone who already pays is charged on the spot, so they
                    // see the amount first; everyone else pays on the checkout page.
                    inPlace ? setConfirmingPlan(plan.key) : go(plan.key, () => startCheckout(plan.key))
                  }
                />
              ) : (
                <p className="text-[10px] text-muted-foreground font-medium">
                  {sub?.status === "cancelled"
                    ? `You have ${sub.planName} until ${until(sub.periodEnd)}. It's cancelled, so it won't renew.`
                    : onPaidPlan
                      ? "You're on our biggest plan. To change or cancel it, use Manage billing."
                      : "Paid plans aren't available yet."}
                </p>
              )}
              {inPlace && upgrades.length > 0 && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  Moving up switches your current subscription and charges only the difference for the rest of this period. To move to a
                  smaller plan or cancel, use Manage billing.
                </p>
              )}
            </div>
          )}

          <UpgradeConfirmDialog
            planKey={confirmingPlan}
            busy={pending !== null}
            onClose={() => setConfirmingPlan(null)}
            onConfirm={(key) => go(key, () => startCheckout(key, true))}
          />

          <SupportProjectCard />
        </div>
      )}
    </div>
  );
}

function UsageRow({ limitType, limit, used }: { limitType: PlanLimitType; limit: number | null; used: number }) {
  const showUsage = !NO_USAGE.includes(limitType);
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const limitText = limit === null ? "Unlimited" : limit === 0 ? "Not included" : formatLimitValue(limitType, limit);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[10px]">
        <span className="text-foreground">{PLAN_LIMIT_LABEL[limitType]}</span>
        <span className="text-muted-foreground font-mono tabular-nums">
          {showUsage && limit !== 0 ? `${formatLimitValue(limitType, used)} / ` : ""}
          {limitText}
        </span>
      </div>
      {showUsage && limit !== null && limit > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden" aria-hidden>
          <div
            className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
