"use client";

import React from "react";
import * as RechartsPrimitive from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/stat-tile";
import { QueryErrorState } from "@/components/query-error-state";
import { GitHubActivity } from "@/components/ui/github-activity";
import { Reveal } from "@/components/ui/reveal";
import { useInsightsQuery } from "@/hooks/use-insights";
import { humanizeLabel, toContributions, withTail, type CountedLabel } from "@/lib/insights";
import { UpgradeNote } from "@/components/plan/upgrade-note";

const countConfig = { count: { label: "Memories", color: "var(--primary)" } } satisfies ChartConfig;

const MAX_CATEGORIES = 6;
const MAX_TYPES = 6;
// A full year of columns, so the grid spans the page rather than sizing
// itself to a narrow card. The component renders only as many as fit.
const ACTIVITY_WEEKS = 53;

function Panel({
  title,
  subtitle,
  index,
  children,
}: {
  title: string;
  subtitle?: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal index={index} className="rounded-surface border border-border p-4">
      <h3 className="text-xs font-bold text-foreground">{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </Reveal>
  );
}

/**
 * Horizontal bars throughout: every dimension here is a label of arbitrary
 * length ("ui_design_inspiration", "projects.100xdevs.com"), which a vertical
 * axis can show in full and a horizontal one can only truncate or rotate.
 */
function LabelledBars({
  data,
  emptyLabel,
  humanize = false,
}: {
  data: CountedLabel[];
  emptyLabel: string;
  // Only for machine-shaped values (`ui_design_inspiration`). Tag, collection
  // and domain names are already written how the user should read them —
  // title-casing them turns "x.com" into "X.com".
  humanize?: boolean;
}) {
  const formatLabel = humanize ? humanizeLabel : (value: string) => value;

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <ChartContainer config={countConfig} className="aspect-auto h-56 w-full">
      <RechartsPrimitive.BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <RechartsPrimitive.CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <RechartsPrimitive.XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} hide />
        <RechartsPrimitive.YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={128}
          tick={{ fontSize: 10 }}
          tickFormatter={formatLabel}
        />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatLabel(String(v))} />} />
        <RechartsPrimitive.Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={14} />
      </RechartsPrimitive.BarChart>
    </ChartContainer>
  );
}

export default function InsightsPage() {
  const { data, isLoading, isError, refetch } = useInsightsQuery();

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <QueryErrorState title="Couldn't load your insights" onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) return <InsightsSkeleton />;

  if (data.totals.memories === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Header />
        <div className="text-center py-20 max-w-sm mx-auto space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Nothing to show yet</h3>
          <p className="text-xs text-muted-foreground">
            Save a few things and this page will fill in with what you collect, what it&apos;s about, and when you save it.
          </p>
        </div>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Header />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Memories", value: totals.memories },
          { label: "Collections", value: totals.collections },
          { label: "Tags", value: totals.tags },
          { label: "Saved this week", value: totals.thisWeek },
        ].map((tile, index) => (
          <Reveal key={tile.label} index={index}>
            <StatTile label={tile.label} value={tile.value.toLocaleString()} />
          </Reveal>
        ))}
      </div>

      {/* The component sizes itself to its column count via an inline width;
          it spreads `style` after that, so this is what makes it fill. */}
      {data.historyDays !== undefined && data.historyDays < 365 && (
        <UpgradeNote feature="insightsFullHistory">
          Showing your last {data.historyDays} days. A full year of insights is on paid plans.
        </UpgradeNote>
      )}
      <GitHubActivity
        className="max-w-full border border-border"
        style={{ width: "100%" }}
        noun="memories saved"
        contributions={toContributions(data.activity, ACTIVITY_WEEKS)}
        accent="var(--primary)"
        months={12}
        cellSize={14}
        showMonths
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel index={5} title="Top topics" subtitle="Your most-used tags">
          <LabelledBars data={data.topTags} emptyLabel="No tags yet." />
        </Panel>

        <Panel index={6} title="What you save" subtitle="By kind of memory">
          <LabelledBars data={withTail(data.byType, MAX_TYPES)} emptyLabel="Nothing saved yet." humanize />
        </Panel>

        <Panel index={7} title="What it's about" subtitle="Categories your AI assistant inferred">
          <LabelledBars data={withTail(data.byCategory, MAX_CATEGORIES)} emptyLabel="Nothing categorised yet." humanize />
        </Panel>

        <Panel index={8} title="Top sites" subtitle="Where your links come from">
          <LabelledBars data={data.topDomains} emptyLabel="No links saved yet." />
        </Panel>

        <Panel index={9} title="How you save" subtitle="Extension, mobile, or straight from the app">
          <LabelledBars data={data.byCaptureMethod} emptyLabel="Nothing saved yet." humanize />
        </Panel>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-bold text-foreground">Insights</h1>
      <p className="text-xs text-muted-foreground">The topics and trends behind what you&apos;ve been saving.</p>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Header />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-surface" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-surface" />
        ))}
      </div>
    </div>
  );
}
