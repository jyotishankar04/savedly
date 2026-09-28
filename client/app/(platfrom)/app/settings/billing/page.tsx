"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyPlan,
  formatLimitValue,
  formatPriceMinor,
  LIMIT_ORDER,
  listPublicPlans,
  openBillingPortal,
  PLAN_LIMIT_LABEL,
  planTier,
  startCheckout,
  type PlanLimitType,
} from "@/lib/plans";
import { getServerConfig } from "@/lib/server-config";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { QueryErrorState } from "@/components/query-error-state";
import { SupportProjectCard } from "@/components/support-project-card";
import { cn } from "@/lib/utils";

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

  // Back from the provider's checkout. The plan switches when its webhook
  // lands (usually seconds), so refetch rather than assume.
  const checkout = searchParams.get("checkout");
  useEffect(() => {
    if (checkout === "success") {
      toast.add({ title: "Thanks! Your plan updates as soon as the payment is confirmed.", type: "success" });
      const timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ["plans", "me"] }), 4000);
      return () => clearTimeout(timer);
    }
    if (checkout === "cancelled") toast.add({ title: "Checkout cancelled. Nothing was charged." });
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

  const onPaidPlan = !!data && data.plan.priceMinor > 0;
  const upgrades = (plans ?? []).filter((p) => p.priceMinor > 0 && planTier(p.key) !== planTier(data?.plan.key ?? ""));

  return (
    <div className="space-y-6 max-w-3xl text-xs font-semibold">
      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Plan & usage</h3>
        <p className="text-[10px] text-muted-foreground">
          {data?.selfHosted
            ? "This is your own install: every feature, with no limits."
            : "Every plan includes every feature. Plans differ only in how much you can store and how much AI we supply."}
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
              {data.assignment?.endsAt && (
                <span className="text-[10px] text-muted-foreground">
                  Renews or ends {new Date(data.assignment.endsAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {data.plan.description && <p className="text-[11px] text-muted-foreground font-medium">{data.plan.description}</p>}

            <div className="space-y-3">
              {LIMIT_ORDER.filter((t) => t in data.limits).map((t) => (
                <UsageRow key={t} limitType={t} limit={data.limits[t] ?? null} used={data.usage[t] ?? 0} />
              ))}
            </div>

            {!data.selfHosted && (
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                The AI allowances cover AI we supply. Add your own key in Settings &gt; AI and your saves and questions are never limited.
              </p>
            )}
          </div>

          {config?.billing && !data.selfHosted && (
            <div className="p-5 border border-border bg-card rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  {onPaidPlan ? "Change or manage your plan" : "Upgrade"}
                </span>
                {onPaidPlan && (
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
                <div className="grid gap-2 sm:grid-cols-2">
                  {upgrades.map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => go(plan.key, () => startCheckout(plan.key))}
                      disabled={pending !== null}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-colors disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-xs font-bold text-foreground">{plan.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-medium">
                          {formatPriceMinor(plan.priceMinor, plan.currency)} {plan.billingInterval === "yearly" ? "per year" : "per month"}
                        </span>
                      </span>
                      {pending === plan.key ? <Spinner /> : <span className="text-[10px] font-bold text-primary">Choose</span>}
                    </button>
                  ))}
                </div>
              ) : (
                !onPaidPlan && <p className="text-[10px] text-muted-foreground font-medium">Paid plans aren&apos;t available yet.</p>
              )}
            </div>
          )}

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
