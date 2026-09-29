"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { getSignupsOverTime } from "@/lib/admin-analytics";
import { getUsageSummary } from "@/lib/ai-usage";
import { listUsers } from "@/lib/admin-users";
import { getServerConfig } from "@/lib/server-config";
import { formatBytes, getSystemStatus, type SystemStatus } from "@/lib/admin-system";

function StatTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-muted/20 transition-colors">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
    </Link>
  );
}

function ServiceRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-xs text-foreground">{label}</span>
      <span className={ok ? "text-xs font-medium text-foreground" : "text-xs text-muted-foreground"}>{value}</span>
    </li>
  );
}

/** What someone running their own install checks: size, services, backups. */
function SelfHostedSystem({ system }: { system: SystemStatus }) {
  const { services } = system;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Users" value={system.users.toLocaleString()} href="/admin/users" />
        <StatTile label="Memories" value={system.memories.toLocaleString()} href="/admin/analytics" />
        <StatTile label="Database" value={formatBytes(system.databaseBytes)} href="/help/self-host#backup" />
        <StatTile
          label="Uploaded files"
          value={system.filesBytes === null ? "In your bucket" : formatBytes(system.filesBytes)}
          href="/admin/infrastructure"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Services</h3>
            <Link href="/admin/infrastructure" className="text-xs text-primary hover:underline">
              Change
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            <ServiceRow label="File storage" value={services.storage} ok />
            <ServiceRow label="Search index" value={services.vectorStore} ok />
            <ServiceRow label="Email" value={services.email ? "On" : "Off"} ok={services.email} />
            <ServiceRow
              label="Embeddings for everyone"
              value={services.embeddingsKey ? "Set up" : "Each person's own key"}
              ok={services.embeddingsKey}
            />
            <ServiceRow
              label="Sign in with Google / GitHub"
              value={
                services.googleSignIn && services.githubSignIn
                  ? "Both"
                  : services.googleSignIn
                    ? "Google"
                    : services.githubSignIn
                      ? "GitHub"
                      : "Off"
              }
              ok={services.googleSignIn || services.githubSignIn}
            />
          </ul>
        </section>

        <section className="rounded-xl border border-border p-4 space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Keep it safe</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything lives in the database, the uploaded files and the secrets volume. Back up all three regularly, and
            before you upgrade.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/help/self-host#backup" className="text-primary hover:underline">
              How to back up
            </Link>
            <Link href="/help/self-host#upgrade" className="text-primary hover:underline">
              How to upgrade
            </Link>
          </div>
          {system.version && <p className="text-[11px] text-muted-foreground font-mono">Version {system.version}</p>}
        </section>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { user } = useUser();
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const selfHosted = !!config?.selfHosted;
  const { data: system } = useQuery({
    queryKey: ["admin", "system"],
    queryFn: getSystemStatus,
    enabled: selfHosted,
  });

  const { data: users } = useQuery({
    queryKey: ["admin", "users", { page: 1, limit: 1 }],
    queryFn: () => listUsers({ page: 1, limit: 1 }),
  });

  const { data: signups } = useQuery({
    queryKey: ["admin", "analytics", "signups", 7],
    queryFn: () => getSignupsOverTime(7),
  });

  const { data: usage } = useQuery({
    queryKey: ["admin", "ai-usage", "summary", 7],
    queryFn: () => getUsageSummary(7),
  });

  const signupsThisWeek = signups?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Welcome, {user.name ?? user.email}.</h2>
        <p className="text-xs text-muted-foreground">
          {selfHosted ? "A quick look at your install right now." : "A quick look at the platform right now."}
        </p>
      </div>

      {selfHosted ? (
        system ? (
          <SelfHostedSystem system={system} />
        ) : (
          <p className="text-xs text-muted-foreground">Loading...</p>
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Total users" value={users ? users.total.toLocaleString() : "—"} href="/admin/users" />
          <StatTile label="Signups (7d)" value={signupsThisWeek.toLocaleString()} href="/admin/analytics" />
          <StatTile label="AI calls (7d)" value={usage ? usage.totals.calls.toLocaleString() : "—"} href="/admin/ai-usage" />
          <StatTile label="Tokens (7d)" value={usage ? usage.totals.totalTokens.toLocaleString() : "—"} href="/admin/ai-usage" />
        </div>
      )}
    </div>
  );
}
