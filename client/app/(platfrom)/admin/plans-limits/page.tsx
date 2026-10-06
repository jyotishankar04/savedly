"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { listAdminPlans, createPlan, updatePlan, type AdminPlan, type PlanLimitInput } from "@/lib/admin-plans";
import { LIMIT_ORDER, PLAN_LIMIT_LABEL, formatPriceMinor, type PlanLimitType } from "@/lib/plans";
import { PlanFeaturesMatrix } from "@/components/admin/plan-features-matrix";

const LIMIT_TYPES: PlanLimitType[] = LIMIT_ORDER;

type Draft = {
  name: string;
  priceMinor: string;
  isActive: boolean;
  isDefault: boolean;
  limits: Record<PlanLimitType, string>; // "" = unlimited
};

function draftFromPlan(plan: AdminPlan): Draft {
  const limits = {} as Record<PlanLimitType, string>;
  for (const t of LIMIT_TYPES) {
    const v = plan.limits[t];
    limits[t] = v == null ? "" : String(v);
  }
  return { name: plan.name, priceMinor: String(plan.priceMinor), isActive: plan.isActive, isDefault: plan.isDefault, limits };
}

export default function AdminPlansLimitsPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({ key: "", name: "", priceMinor: "0" });

  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: listAdminPlans,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });

  const draftFor = (plan: AdminPlan): Draft => drafts[plan.id] ?? draftFromPlan(plan);

  const patchDraft = (planId: string, plan: AdminPlan, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [planId]: { ...draftFor(plan), ...prev[planId], ...patch } }));
  };

  const save = async (plan: AdminPlan) => {
    const draft = draftFor(plan);
    setSavingId(plan.id);
    try {
      const limits: PlanLimitInput[] = LIMIT_TYPES.map((t) => ({
        limitType: t,
        limitValue: draft.limits[t].trim() === "" ? null : Number(draft.limits[t]),
      }));
      await updatePlan(plan.id, {
        name: draft.name.trim(),
        priceMinor: Number(draft.priceMinor) || 0,
        isActive: draft.isActive,
        isDefault: draft.isDefault,
        limits,
      });
      invalidate();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[plan.id];
        return next;
      });
      toast.add({ title: `${draft.name} updated.`, type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Failed to update plan.", type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newPlan.key.trim() || !newPlan.name.trim()) return;
    setCreating(true);
    try {
      await createPlan({
        key: newPlan.key.trim(),
        name: newPlan.name.trim(),
        priceMinor: Number(newPlan.priceMinor) || 0,
        limits: LIMIT_TYPES.map((t) => ({ limitType: t, limitValue: null })),
      });
      invalidate();
      setNewPlan({ key: "", name: "", priceMinor: "0" });
      toast.add({ title: "Plan created.", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Failed to create plan.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Plans &amp; Limits</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Pricing tiers and what each one caps — edited here, enforced live server-side. No deploy needed.
        </p>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {isError && <p className="text-xs text-destructive">Failed to load plans.</p>}

      {plans && <PlanFeaturesMatrix plans={plans} onChanged={invalidate} />}

      <div className="space-y-4">
        {plans?.map((plan) => {
          const draft = draftFor(plan);
          const dirty = Boolean(drafts[plan.id]);
          return (
            <div key={plan.id} className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={draft.name}
                    onChange={(e) => patchDraft(plan.id, plan, { name: e.target.value })}
                    className="h-8 w-40 text-sm font-bold"
                  />
                  <Badge variant="secondary" className="font-mono text-[10px]">{plan.key}</Badge>
                  {plan.isDefault && <Badge className="text-[10px]">Default</Badge>}
                  {!plan.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 pt-1.5">
                  {formatPriceMinor(plan.priceMinor, plan.currency)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Price (minor units)</span>
                  <Input
                    value={draft.priceMinor}
                    onChange={(e) => patchDraft(plan.id, plan, { priceMinor: e.target.value })}
                    className="h-7 w-24 text-xs font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Switch checked={draft.isActive} onCheckedChange={(v) => patchDraft(plan.id, plan, { isActive: v })} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Switch checked={draft.isDefault} onCheckedChange={(v) => patchDraft(plan.id, plan, { isDefault: v })} />
                  Default on signup
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LIMIT_TYPES.map((t) => (
                  <div key={t} className="space-y-1">
                    <label className="text-[9px] text-muted-foreground uppercase tracking-wide block">{PLAN_LIMIT_LABEL[t]}</label>
                    <Input
                      placeholder="Unlimited"
                      value={draft.limits[t]}
                      onChange={(e) =>
                        patchDraft(plan.id, plan, { limits: { ...draft.limits, [t]: e.target.value.replace(/[^0-9]/g, "") } })
                      }
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!dirty || savingId === plan.id}
                  onClick={() => save(plan)}
                  className="h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-3.5 hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  {savingId === plan.id ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border border-dashed border-border rounded-xl space-y-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">New plan</span>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="key (e.g. team)" value={newPlan.key} onChange={(e) => setNewPlan((p) => ({ ...p, key: e.target.value }))} className="w-32" />
          <Input placeholder="Display name" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} className="w-48" />
          <Input placeholder="Price (minor units)" value={newPlan.priceMinor} onChange={(e) => setNewPlan((p) => ({ ...p, priceMinor: e.target.value }))} className="w-40" />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newPlan.key.trim() || !newPlan.name.trim()}
            className="h-9 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-4 hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Create
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Limits default to unlimited — edit the new plan&apos;s card above after creating it.</p>
      </div>
    </div>
  );
}
