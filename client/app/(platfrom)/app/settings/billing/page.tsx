"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyPlan, formatLimitValue, LIMIT_ORDER, PLAN_LIMIT_LABEL, type PlanLimitType } from "@/lib/plans";
import { QueryErrorState } from "@/components/query-error-state";
import { SupportProjectCard } from "@/components/support-project-card";
import { cn } from "@/lib/utils";

// Limits with no running total (a per-file cap) show the cap only.
const NO_USAGE: PlanLimitType[] = ["max_file_mb"];

export default function BillingSettingsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plans", "me"],
    queryFn: getMyPlan,
  });

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
