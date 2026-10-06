"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updatePlan, type AdminPlan } from "@/lib/admin-plans";
import type { PlanFeature } from "@/lib/plans";

// Every feature the server gates by plan (PLAN_FEATURES in the server's
// plans.service.ts), with what turning it on lets someone do.
const FEATURES: { key: PlanFeature; name: string; detail: string }[] = [
  { key: "calendarSync", name: "Google Calendar", detail: "Connect Google Calendar, and add events from the Calendar page" },
  { key: "aiEventDetection", name: "Event detection", detail: "The AI spots dates in saved items and offers to add them" },
  { key: "vault", name: "Private vault", detail: "Hide memories behind a PIN" },
  { key: "batchOperations", name: "Bulk actions", detail: "Select several memories and act on them at once" },
  { key: "passwordProtectedShares", name: "Password-protected links", detail: "Put a password on a share link" },
  { key: "directShares", name: "Invite people", detail: "Share with named people by email" },
  { key: "privateShareRequests", name: "Access requests", detail: "Links where people ask for access and the owner approves" },
  { key: "shareAnalyticsDaily", name: "Daily share views", detail: "A day-by-day chart of views on a share" },
  { key: "shareAnalyticsViewers", name: "Who viewed a share", detail: "The list of people who opened a share" },
  { key: "insightsFullHistory", name: "Full insights history", detail: "A year of insights instead of the recent window" },
];

interface Tier {
  name: string;
  plans: AdminPlan[];
}

/** Monthly and yearly versions of a plan are one tier here: they should always unlock the same things. */
function tiersOf(plans: AdminPlan[]): Tier[] {
  const tiers: Tier[] = [];
  for (const plan of [...plans].filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const existing = tiers.find((tier) => tier.name === plan.name);
    if (existing) existing.plans.push(plan);
    else tiers.push({ name: plan.name, plans: [plan] });
  }
  return tiers;
}

/**
 * Which features each plan includes, as a grid: a row per feature, a column
 * per tier. Flipping a switch saves at once and is enforced by the server on
 * the next request, so there's no deploy and no restart. A restart doesn't
 * undo it either: the defaults are only written for plans that don't exist.
 */
export function PlanFeaturesMatrix({ plans, onChanged }: { plans: AdminPlan[]; onChanged: () => void }) {
  const tiers = tiersOf(plans);
  // "<feature>:<tier>" while that cell is saving.
  const [saving, setSaving] = useState<string | null>(null);

  const stateOf = (tier: Tier, key: PlanFeature): "on" | "off" | "mixed" => {
    const on = tier.plans.filter((plan) => plan.features[key]).length;
    return on === tier.plans.length ? "on" : on === 0 ? "off" : "mixed";
  };

  const toggle = async (tier: Tier, feature: (typeof FEATURES)[number], next: boolean) => {
    setSaving(`${feature.key}:${tier.name}`);
    try {
      await Promise.all(tier.plans.map((plan) => updatePlan(plan.id, { features: { ...plan.features, [feature.key]: next } })));
      onChanged();
      toast.add({ title: `${feature.name} ${next ? "added to" : "removed from"} ${tier.name}`, type: "success" });
    } catch (err) {
      onChanged();
      toast.add({ title: "Couldn't save that change", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setSaving(null);
    }
  };

  if (tiers.length === 0) return null;

  // A cheaper plan offering something a dearer one doesn't is almost always a mistake.
  const gaps = FEATURES.flatMap((feature) =>
    tiers.flatMap((tier, i) =>
      i > 0 && stateOf(tier, feature.key) === "off" && tiers.slice(0, i).some((lower) => stateOf(lower, feature.key) !== "off")
        ? [`${tier.name} doesn't include ${feature.name}, but a cheaper plan does.`]
        : [],
    ),
  );

  return (
    <section aria-labelledby="plan-features" className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 id="plan-features" className="text-sm font-semibold text-foreground">
          Features by plan
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          Turn a feature on for a plan and everyone on that plan gets it straight away. Monthly and yearly versions of a plan change together.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
                Feature
              </th>
              {tiers.map((tier) => (
                <th key={tier.name} scope="col" className="w-24 px-3 py-2.5 text-center font-semibold text-foreground">
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.key} className="border-b border-border/60 last:border-b-0">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className="block text-[13px] font-medium text-foreground">{feature.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{feature.detail}</span>
                </th>
                {tiers.map((tier) => {
                  const state = stateOf(tier, feature.key);
                  const cell = `${feature.key}:${tier.name}`;
                  return (
                    <td key={tier.name} className="px-3 py-2.5 text-center">
                      <span className={cn("inline-flex flex-col items-center gap-1", saving === cell && "opacity-60")}>
                        <Switch
                          checked={state === "on"}
                          disabled={saving !== null}
                          onCheckedChange={(next) => toggle(tier, feature, next)}
                          aria-label={`${feature.name} on the ${tier.name} plan`}
                        />
                        {state === "mixed" && <span className="text-[10px] text-amber-600 dark:text-amber-400">Monthly and yearly differ</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gaps.length > 0 && (
        <ul className="space-y-1 border-t border-border bg-amber-500/10 px-4 py-2.5 text-[11px] text-amber-800 dark:text-amber-300">
          {gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
