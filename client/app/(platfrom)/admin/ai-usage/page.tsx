"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as RechartsPrimitive from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { StatTile } from "@/components/stat-tile";
import { getUsageByUser, getUsageSummary } from "@/lib/ai-usage";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const chartConfig = {
  totalTokens: { label: "Tokens", color: "var(--primary)" },
} satisfies ChartConfig;

function BreakdownTable<T extends { calls: number; totalTokens: number }>({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: T[];
  labelKey: keyof T;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-4 text-center text-muted-foreground">No data yet.</td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2 font-medium text-foreground">{String(row[labelKey])}</td>
              <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">{row.calls.toLocaleString()} calls</td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">{row.totalTokens.toLocaleString()} tok</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAiUsagePage() {
  const [days, setDays] = useState("30");
  const daysNum = Number(days);

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ["admin", "ai-usage", "summary", daysNum],
    queryFn: () => getUsageSummary(daysNum),
  });

  const { data: byUser, isLoading: byUserLoading } = useQuery({
    queryKey: ["admin", "ai-usage", "by-user", daysNum],
    queryFn: () => getUsageByUser(daysNum, 1, 10),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">AI Usage</h1>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Token usage and cost across every AI call — ingestion and Ask, combined.</p>
        <Select items={RANGE_OPTIONS} value={days} onValueChange={(v) => v && setDays(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summaryLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {summaryError && <p className="text-xs text-destructive">Failed to load AI usage.</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Calls" value={summary.totals.calls.toLocaleString()} />
            <StatTile label="Total tokens" value={summary.totals.totalTokens.toLocaleString()} />
            <StatTile label="Prompt tokens" value={summary.totals.promptTokens.toLocaleString()} />
            <StatTile label="Completion tokens" value={summary.totals.completionTokens.toLocaleString()} />
          </div>

          <div className="rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">Tokens per day</h3>
            {summary.byDay.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No usage recorded in this range yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <RechartsPrimitive.BarChart data={summary.byDay}>
                  <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <RechartsPrimitive.XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  />
                  <RechartsPrimitive.YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <RechartsPrimitive.Bar dataKey="totalTokens" fill="var(--color-totalTokens)" radius={4} />
                </RechartsPrimitive.BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakdownTable title="By provider" rows={summary.byProvider} labelKey="provider" />
            <BreakdownTable title="By model" rows={summary.byModel} labelKey="model" />
          </div>

          <BreakdownTable title="By request type" rows={summary.byRequestType} labelKey="requestType" />
        </>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
          <h3 className="text-xs font-bold text-foreground">Top users by usage</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="text-left font-semibold px-4 py-2">User</th>
              <th className="text-right font-semibold px-4 py-2">Calls</th>
              <th className="text-right font-semibold px-4 py-2">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {byUserLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {byUser && byUser.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No usage recorded in this range yet.
                </td>
              </tr>
            )}
            {byUser?.items.map((item) => (
              <tr key={item.userId} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${item.userId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                    {item.name ?? item.email ?? item.userId}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{item.calls.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums">{item.totalTokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
