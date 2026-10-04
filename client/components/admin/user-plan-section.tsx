"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/auth";
import { listAdminPlans } from "@/lib/admin-plans";
import { formatMoneyMinor, planTier } from "@/lib/plans";
import { getUserPlan, grantUserPlan, removeUserPlanGrant, type PlanSource } from "@/lib/admin-users";

type Duration = "1m" | "3m" | "1y" | "none" | "custom";

const DURATIONS: { value: Duration; label: string }[] = [
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "1y", label: "1 year" },
  { value: "none", label: "No end date" },
  { value: "custom", label: "Pick a date" },
];

const SOURCE_LABEL: Record<PlanSource, string> = {
  subscription: "Paid",
  admin_manual: "Set by an admin",
  signup_default: "Default",
};

function endDate(duration: Duration, custom: string): string | null {
  if (duration === "none") return null;
  if (duration === "custom") return custom ? new Date(`${custom}T23:59:59`).toISOString() : null;
  const date = new Date();
  if (duration === "1m") date.setMonth(date.getMonth() + 1);
  if (duration === "3m") date.setMonth(date.getMonth() + 3);
  if (duration === "1y") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

/**
 * Admin -> a user: see their plan and where it comes from, and put them on
 * any plan (a grant) or take a grant away. A grant overrides what they pay
 * for while it lasts; it never starts, changes or stops a charge.
 */
export function UserPlanSection({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "users", userId, "plan"], queryFn: () => getUserPlan(userId) });
  const { data: plans } = useQuery({ queryKey: ["admin", "plans"], queryFn: listAdminPlans });

  // One choice per tier (Lite, not Lite monthly + Lite yearly): a grant has
  // its own end date, so the billing interval doesn't matter.
  const choices = useMemo(() => {
    const seen = new Set<string>();
    return (plans ?? [])
      .filter((p) => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((p) => {
        const tier = planTier(p.key);
        if (seen.has(tier)) return false;
        seen.add(tier);
        return true;
      });
  }, [plans]);

  const [planKey, setPlanKey] = useState("");
  const [duration, setDuration] = useState<Duration>("1m");
  const [customDate, setCustomDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"grant" | "remove" | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Tomorrow, fixed at mount: the earliest a custom end date can be.
  const [minCustomDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  const chosen = choices.find((p) => p.key === planKey);
  // Ranked against the plan they pay for, to warn before putting them below it.
  const paidRank = plans?.find((p) => p.key === data?.subscription?.planKey)?.sortOrder;
  const canGrant = !!chosen && (duration !== "custom" || !!customDate) && busy === null;

  const refresh = (next: unknown) => {
    queryClient.setQueryData(["admin", "users", userId, "plan"], next);
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const grant = async () => {
    if (!chosen) return;
    setBusy("grant");
    try {
      refresh(await grantUserPlan(userId, { planKey: chosen.key, endsAt: endDate(duration, customDate), reason: reason.trim() || undefined }));
      toast.add({ title: `Moved to ${chosen.name}.`, type: "success" });
      setPlanKey("");
      setReason("");
    } catch (err) {
      toast.add({ title: err instanceof ApiError ? err.message : "Couldn't change the plan.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      const next = await removeUserPlanGrant(userId);
      refresh(next);
      toast.add({ title: `Back on ${next.current.planName}.`, type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof ApiError ? err.message : "Couldn't remove the grant.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Plan</h3>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const { current, subscription } = data;
  const source = current.source ?? "signup_default";
  const granted = source === "admin_manual";
  const grantRow = granted ? data.history.find((row) => row.source === "admin_manual" && row.status === "active") : null;
  // They pay through Dodo and it can still be changed: the form acts on the
  // subscription itself (switch plan, or cancel at period end), not a grant.
  const live = data.billing;
  const subMode = !!live?.changeable;
  const sameAsPaid = subMode && !!chosen && planTier(chosen.key) === planTier(live!.planKey);
  const cancelling = subMode && !!chosen && chosen.priceMinor <= 0;
  // The best running plan wins, so a grant at or below a paid plan does nothing.
  const belowPaid = !subMode && !!chosen && paidRank !== undefined && chosen.sortOrder <= paidRank;
  const idleGrant = data.hasActiveGrant && !granted ? data.history.find((row) => row.source === "admin_manual" && row.status === "active") : null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Plan</h3>

      <div className="rounded-xl border border-border p-4 space-y-4">
        {/* Where they are now, and why */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">{current.planName}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  source === "subscription" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  granted && "bg-primary/10 text-primary",
                  source === "signup_default" && "bg-muted text-muted-foreground",
                )}
              >
                {SOURCE_LABEL[source]}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {granted
                ? `${grantRow?.assignedByEmail ? `By ${grantRow.assignedByEmail}` : "By an admin"} · ${current.endsAt ? `until ${day(current.endsAt)}` : "no end date"}${current.reason ? ` · "${current.reason}"` : ""}`
                : source === "subscription"
                  ? data.billing?.cancelAtPeriodEnd
                    ? `Dodo subscription · cancels ${day(data.billing.periodEnd)}, no more charges`
                    : data.billing?.status === "cancelled"
                      ? `Dodo subscription · cancelled, theirs until ${day(data.billing.periodEnd)}`
                      : `Dodo subscription · renews ${day(current.endsAt)}`
                  : "Nobody has paid for or given them a plan."}
            </p>
            {granted && grantRow?.value && grantRow.value.monthlyMinor > 0 && (
              <p className="text-[11px] font-medium text-foreground">
                Worth {formatMoneyMinor(grantRow.value.monthlyMinor, grantRow.currency)} a month ·{" "}
                {formatMoneyMinor(grantRow.value.givenSoFarMinor, grantRow.currency)} given so far
                {grantRow.value.stillToComeMinor > 0
                  ? ` · ${formatMoneyMinor(grantRow.value.stillToComeMinor, grantRow.currency)} more by ${day(grantRow.endsAt)}`
                  : ""}
              </p>
            )}
            {idleGrant && (
              <p className="text-[11px] text-muted-foreground">
                Their grant of {idleGrant.planName}
                {idleGrant.endsAt ? ` (until ${day(idleGrant.endsAt)})` : ""} has no effect while their paid plan is bigger.
              </p>
            )}
            {granted && subscription && (
              <p className="text-[11px] text-muted-foreground">
                They also pay for {subscription.planName} (through {day(subscription.endsAt)}), and go back to it when this grant ends.
              </p>
            )}
          </div>
          {data.hasActiveGrant && (
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={remove}>
              {busy === "remove" && <Spinner />}
              Remove grant
            </Button>
          )}
        </div>

        {/* Give a plan */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-[11px] font-semibold text-foreground">{subMode ? "Change their subscription" : "Give a plan"}</p>

          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Plan">
            {choices.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={planKey === p.key}
                onClick={() => setPlanKey(p.key)}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-[11px] font-semibold transition-colors",
                  planKey === p.key ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          {!subMode && (
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="How long">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={duration === d.value}
                onClick={() => setDuration(d.value)}
                className={cn(
                  "h-7 rounded-full px-3 text-[10px] font-semibold transition-colors",
                  duration === d.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
            {duration === "custom" && (
              <Input
                type="date"
                value={customDate}
                min={minCustomDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-7 w-40 text-xs"
                aria-label="End date"
              />
            )}
          </div>
          )}

          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="Why (optional), e.g. beta tester, refund, support goodwill"
            className="h-8 text-xs"
          />

          {belowPaid && subscription && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              They&apos;ve paid for {subscription.planName} through {day(subscription.endsAt)}, so a grant can&apos;t give them less. Pick a
              bigger plan to give them more on top.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              disabled={!canGrant || sameAsPaid || belowPaid || (cancelling && live?.cancelAtPeriodEnd)}
              onClick={() => (subMode ? setConfirming(true) : grant())}
            >
              {busy === "grant" && <Spinner />}
              {!chosen
                ? "Pick a plan"
                : sameAsPaid
                  ? `Already on ${chosen.name}`
                  : cancelling
                    ? live?.cancelAtPeriodEnd
                      ? "Already cancelling"
                      : "Cancel at period end"
                    : subMode
                      ? `Switch to ${chosen.name}`
                      : `Move to ${chosen.name}`}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              {subMode
                ? "Changes their Dodo subscription, so billing and the app stay the same."
                : "Takes effect now. It doesn't change billing: a Dodo subscription keeps charging until it's cancelled in Dodo."}
            </p>
          </div>
        </div>

        {data.history.length > 0 && (
          <details className="border-t border-border pt-3 group">
            <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              History ({data.history.length})
            </summary>
            <ul className="mt-2 space-y-1.5">
              {data.history.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px]">
                  <span className="text-foreground">
                    <span className="font-semibold">{row.planName}</span>{" "}
                    <span className="text-muted-foreground">
                      · {row.source === "admin_manual" && row.assignedByEmail ? `Set by ${row.assignedByEmail}` : SOURCE_LABEL[row.source]}
                      {row.reason ? ` · "${row.reason}"` : ""}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {day(row.startsAt)} → {row.endsAt ? day(row.endsAt) : "no end"} · {row.status}
                    {row.value && row.value.givenSoFarMinor > 0 ? ` · ${formatMoneyMinor(row.value.givenSoFarMinor, row.currency)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {subMode && chosen && live && (
        <AlertDialog open={confirming} onOpenChange={(open) => !busy && setConfirming(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {cancelling ? "Cancel their subscription at period end?" : `Switch them to ${chosen.name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {cancelling
                  ? `Their ${live.planName} subscription won't renew. They keep ${live.planName} until ${day(live.periodEnd)} and aren't charged again.`
                  : `Their Dodo subscription moves from ${live.planName} to ${chosen.name} now, keeping the same billing period. Nothing is charged today; their next renewal on ${day(live.periodEnd)} is at ${chosen.name}'s price.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy !== null}>Not now</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy !== null}
                onClick={async () => {
                  await grant();
                  setConfirming(false);
                }}
              >
                {busy === "grant" && <Spinner />}
                {cancelling ? "Cancel at period end" : `Switch to ${chosen.name}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
