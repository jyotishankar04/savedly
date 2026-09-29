"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPlanGrantsSummary } from "@/lib/admin-plans";
import { formatMoneyMinor } from "@/lib/plans";

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

/**
 * Admin -> Overview: what admins have given away as plan grants, valued at
 * the plans' prices (see server plan-grants.service.ts). Hosted only.
 */
export function PlanGrantsPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "plans", "grants"], queryFn: getPlanGrantsSummary });
  if (isLoading || !data) return null;

  const total = data.totals[0];
  const currency = total?.currency ?? "usd";
  const money = (minor: number) => formatMoneyMinor(minor, currency);

  return (
    <section className="rounded-xl border border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Paid access given away</h3>
        <p className="text-[10px] text-muted-foreground">Plans admins gave users, valued at the plan&apos;s price per day.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60">
        <Figure label="Given so far" value={money(total?.givenSoFarMinor ?? 0)} />
        <Figure label="Costing now" value={`${money(total?.monthlyNowMinor ?? 0)} / mo`} />
        <Figure
          label="Still to come"
          value={money(total?.stillToComeMinor ?? 0)}
          note={data.openEndedGrants ? `+ ${data.openEndedGrants} with no end date` : undefined}
        />
        <Figure label="Active grants" value={data.activeGrants.toLocaleString()} note={`${data.grants.toLocaleString()} ever`} />
      </div>

      {data.totals.length > 1 && (
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          Also:{" "}
          {data.totals
            .slice(1)
            .map((t) => `${formatMoneyMinor(t.givenSoFarMinor, t.currency)} given in ${t.currency.toUpperCase()}`)
            .join(", ")}
        </p>
      )}

      {data.grants > 0 && (
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-[1fr_2fr]">
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-muted-foreground">By admin</h4>
            <ul className="space-y-1.5">
              {data.byAdmin.map((admin) => (
                <li key={`${admin.email}-${admin.currency}`} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-foreground">{admin.email}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatMoneyMinor(admin.givenSoFarMinor, admin.currency)} · {admin.grants}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-muted-foreground">Running now</h4>
            {data.active.length === 0 ? (
              <p className="text-xs text-muted-foreground">No paid grants running.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.active.map((grant) => (
                  <li key={grant.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 text-xs">
                    <span className="min-w-0">
                      {grant.userId ? (
                        <Link href={`/admin/users/${grant.userId}`} className="font-semibold text-foreground hover:text-primary">
                          {grant.userEmail ?? "Deleted user"}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted-foreground">Deleted user</span>
                      )}{" "}
                      <span className="text-muted-foreground">
                        · {grant.planName} · {grant.endsAt ? `until ${day(grant.endsAt)}` : "no end date"}
                        {grant.reason ? ` · "${grant.reason}"` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {formatMoneyMinor(grant.monthlyMinor, grant.currency)}/mo · {formatMoneyMinor(grant.givenSoFarMinor, grant.currency)} so far
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground tabular-nums">{value}</p>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}
