"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as RechartsPrimitive from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getActiveUsers, getContentGrowth, getSignupsOverTime } from "@/lib/admin-analytics";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const signupsConfig = { count: { label: "Signups", color: "var(--primary)" } } satisfies ChartConfig;
const activeConfig = { count: { label: "Active users", color: "var(--primary)" } } satisfies ChartConfig;
const growthConfig = {
  memories: { label: "Memories", color: "var(--primary)" },
  collections: { label: "Collections", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function formatDate(v: string): string {
  return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="text-xs font-bold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState("30");
  const daysNum = Number(days);

  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ["admin", "analytics", "signups", daysNum],
    queryFn: () => getSignupsOverTime(daysNum),
  });

  const { data: active, isLoading: activeLoading } = useQuery({
    queryKey: ["admin", "analytics", "active-users", daysNum],
    queryFn: () => getActiveUsers(daysNum),
  });

  const { data: growth, isLoading: growthLoading } = useQuery({
    queryKey: ["admin", "analytics", "content-growth", daysNum],
    queryFn: () => getContentGrowth(daysNum),
  });

  // Merge memories/collections series into one row-per-date array for a combined chart.
  const growthData = React.useMemo(() => {
    if (!growth) return [];
    const byDate = new Map<string, { date: string; memories: number; collections: number }>();
    for (const row of growth.memories) {
      byDate.set(row.date, { date: row.date, memories: row.count, collections: byDate.get(row.date)?.collections ?? 0 });
    }
    for (const row of growth.collections) {
      byDate.set(row.date, { date: row.date, memories: byDate.get(row.date)?.memories ?? 0, collections: row.count });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [growth]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">Analytics</h1>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Signups, active users, and content growth across the platform.</p>
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

      <ChartPanel title="Signups">
        {signupsLoading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Loading...</p>
        ) : !signups || signups.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No signups in this range.</p>
        ) : (
          <ChartContainer config={signupsConfig} className="aspect-auto h-56 w-full">
            <RechartsPrimitive.BarChart data={signups}>
              <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
              <RechartsPrimitive.XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
              <RechartsPrimitive.YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v))} />} />
              <RechartsPrimitive.Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </RechartsPrimitive.BarChart>
          </ChartContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Active users">
        {activeLoading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Loading...</p>
        ) : !active || active.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No active-session data in this range.</p>
        ) : (
          <ChartContainer config={activeConfig} className="aspect-auto h-56 w-full">
            <RechartsPrimitive.LineChart data={active}>
              <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
              <RechartsPrimitive.XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
              <RechartsPrimitive.YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v))} />} />
              <RechartsPrimitive.Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
            </RechartsPrimitive.LineChart>
          </ChartContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Content growth">
        {growthLoading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Loading...</p>
        ) : growthData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No new content in this range.</p>
        ) : (
          <ChartContainer config={growthConfig} className="aspect-auto h-56 w-full">
            <RechartsPrimitive.LineChart data={growthData}>
              <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
              <RechartsPrimitive.XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
              <RechartsPrimitive.YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDate(String(v))} />} />
              <RechartsPrimitive.Line type="monotone" dataKey="memories" stroke="var(--color-memories)" strokeWidth={2} dot={false} />
              <RechartsPrimitive.Line type="monotone" dataKey="collections" stroke="var(--color-collections)" strokeWidth={2} dot={false} />
            </RechartsPrimitive.LineChart>
          </ChartContainer>
        )}
      </ChartPanel>
    </div>
  );
}
