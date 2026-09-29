"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import * as RechartsPrimitive from "recharts";
import {
  ArrowLeft01Icon as ArrowLeft,
  Copy01Icon as Copy,
  Layers01Icon as Layers,
  FileTextIcon as FileText,
  UserIcon,
  Globe02Icon as Anonymous,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { StatTile } from "@/components/stat-tile";
import { Reveal } from "@/components/ui/reveal";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { copyToClipboard } from "@/lib/clipboard";
import { fillDailyViewSeries, type ShareResourceType } from "@/lib/shares";
import { LINK_MODE_META } from "@/lib/share-display";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { UpgradeNote } from "@/components/plan/upgrade-note";
import {
  useMySharesQuery,
  useShareViewSummaryQuery,
  useShareViewersQuery,
  useShareViewsDailyQuery,
} from "@/hooks/use-shares";

const viewsConfig = { count: { label: "Views", color: "var(--primary)" } } satisfies ChartConfig;

export default function ShareAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;

  // There's no GET /shares/:id — the list this page came from is already
  // cached, so finding the row in it is one query instead of a second
  // single-share endpoint that would exist only for this page.
  const { data: shares, isLoading: sharesLoading, isError, refetch } = useMySharesQuery();
  const share = shares?.find((item) => item.id === shareId);

  const summary = useShareViewSummaryQuery(shareId);
  // The total count is on every plan; the daily chart and who viewed are plan features.
  const dailyFeature = usePlanFeature("shareAnalyticsDaily");
  const viewersFeature = usePlanFeature("shareAnalyticsViewers");
  const viewers = useShareViewersQuery(shareId, viewersFeature.allowed);
  const daily = useShareViewsDailyQuery(shareId, dailyFeature.allowed);

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <QueryErrorState title="Couldn't load this share" onRetry={() => refetch()} />
      </div>
    );
  }

  if (sharesLoading) return <PageSkeleton />;

  if (!share) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-foreground">Share not found</p>
        <p className="text-xs text-muted-foreground">
          It may have been deleted, or it isn&apos;t one of yours.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/app/shared")} className="rounded-full">
          Back to Shared
        </Button>
      </div>
    );
  }

  const mode = LINK_MODE_META[share.linkAccess];
  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${share.slug}` : "";
  const chartData = fillDailyViewSeries(daily.data ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link
        href="/app/shared"
        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to Shared
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/20 pb-6">
        <div className="flex items-start gap-3">
          <ResourceIcon type={share.resourceType} />
          <div>
            <h1 className="text-lg font-bold text-foreground">{share.resourceName}</h1>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                mode.tone
              )}
            >
              <HugeiconsIcon icon={mode.icon} strokeWidth={2.25} className="h-2.5 w-2.5" />
              {mode.label}
            </span>
          </div>
        </div>

        {share.linkAccess !== "disabled" && (
          <div className="flex items-center gap-1.5">
            <code className="rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground">
              /s/{share.slug}
            </code>
            <Button size="icon" variant="outline" aria-label="Copy link" className="h-8 w-8" onClick={() => void copyToClipboard(url)}>
              <HugeiconsIcon icon={Copy} strokeWidth={2.25} className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total views", value: share.viewCount },
          { label: "Unique viewers", value: (summary.data?.uniqueSignedInViewers ?? 0) + (summary.data?.uniqueAnonymousViewers ?? 0) },
          { label: "Signed in", value: summary.data?.uniqueSignedInViewers ?? 0 },
          { label: "Anonymous", value: summary.data?.uniqueAnonymousViewers ?? 0 },
        ].map((tile, index) => (
          <Reveal key={tile.label} index={index}>
            <StatTile label={tile.label} value={tile.value.toLocaleString()} />
          </Reveal>
        ))}
      </div>

      <Reveal index={4} className="rounded-surface border border-border p-4">
        <h3 className="text-xs font-bold text-foreground">Views over time</h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Last 30 days</p>
        {!dailyFeature.allowed ? (
          <UpgradeNote feature="shareAnalyticsDaily" className="py-8 justify-center" />
        ) : share.viewCount === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No views yet.</p>
        ) : (
          <ChartContainer config={viewsConfig} className="mt-3 aspect-auto h-48 w-full">
            <RechartsPrimitive.BarChart data={chartData} margin={{ left: 0, right: 8 }}>
              <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
              <RechartsPrimitive.XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => value.slice(5)}
                tick={{ fontSize: 9 }}
                interval={Math.ceil(chartData.length / 8)}
              />
              <RechartsPrimitive.YAxis tickLine={false} axisLine={false} allowDecimals={false} width={24} tick={{ fontSize: 9 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <RechartsPrimitive.Bar dataKey="count" fill="var(--color-count)" radius={3} />
            </RechartsPrimitive.BarChart>
          </ChartContainer>
        )}
      </Reveal>

      <Reveal index={5} className="rounded-surface border border-border p-4">
        <h3 className="text-xs font-bold text-foreground">Who viewed this</h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Most recent first</p>

        {!viewersFeature.allowed ? (
          <UpgradeNote feature="shareAnalyticsViewers" className="py-8 justify-center" />
        ) : viewers.isLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !viewers.data || viewers.data.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No one has viewed this yet.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {viewers.data.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-foreground/5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    entry.isAnonymous ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  <HugeiconsIcon icon={entry.isAnonymous ? Anonymous : UserIcon} strokeWidth={2.25} className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {entry.isAnonymous ? "Anonymous visitor" : (entry.viewerName ?? entry.viewerEmail)}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">{timeAgo(entry.viewedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </div>
  );
}

function ResourceIcon({ type }: { type: ShareResourceType }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <HugeiconsIcon icon={type === "collection" ? Layers : FileText} strokeWidth={2.25} className="h-5 w-5" />
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-surface" />
      <Skeleton className="h-56 w-full rounded-surface" />
    </div>
  );
}
