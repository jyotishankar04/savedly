"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  EyeIcon as Eye,
  UserGroupIcon as Users,
  UserIcon as UserIcon,
  Globe02Icon as Anonymous,
  ChevronDownIcon as ChevronDown,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { useShareViewSummaryQuery, useShareViewersQuery } from "@/hooks/use-shares";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { UpgradeNote } from "@/components/plan/upgrade-note";

/**
 * "Who viewed this" — expand-to-see, not open by default, since fetching
 * the viewer list for every share row would be a query nobody asked for
 * most of the time.
 *
 * The two numbers that matter are kept visually distinct: total views is a
 * raw count (a returning visitor adds to it every ~30 minutes — see
 * share.views.ts's dedup window), while unique viewers is "how many
 * different people", which is what an owner actually wants to know when
 * they ask "did anyone look at this".
 */
export function ShareAnalytics({
  shareId,
  totalViews,
  detailsHref,
}: {
  shareId: string;
  totalViews: number;
  /** When given, the expanded panel links to the dedicated analytics page for more than a quick peek. */
  detailsHref?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const summary = useShareViewSummaryQuery(shareId, expanded);
  const viewersFeature = usePlanFeature("shareAnalyticsViewers");
  const viewers = useShareViewersQuery(shareId, expanded && viewersFeature.allowed);

  if (totalViews === 0) {
    return <p className="text-[10px] text-muted-foreground">No views yet</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={Eye} strokeWidth={2.25} className="h-3 w-3" />
        {totalViews} {totalViews === 1 ? "view" : "views"}
        <HugeiconsIcon
          icon={ChevronDown}
          strokeWidth={2.25}
          className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="space-y-2 rounded-lg border border-border bg-foreground/[0.02] p-2.5">
          {summary.isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : summary.data ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <HugeiconsIcon icon={Users} strokeWidth={2.25} className="h-3 w-3" />
                {summary.data.uniqueSignedInViewers + summary.data.uniqueAnonymousViewers} unique{" "}
                {summary.data.uniqueSignedInViewers + summary.data.uniqueAnonymousViewers === 1
                  ? "viewer"
                  : "viewers"}
              </span>
              {summary.data.uniqueSignedInViewers > 0 && (
                <span>
                  {summary.data.uniqueSignedInViewers} signed in
                </span>
              )}
              {summary.data.uniqueAnonymousViewers > 0 && (
                <span>{summary.data.uniqueAnonymousViewers} anonymous</span>
              )}
            </div>
          ) : null}

          {!viewersFeature.allowed ? (
            <UpgradeNote feature="shareAnalyticsViewers" />
          ) : viewers.isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : viewers.data && viewers.data.length > 0 ? (
            <ul className="space-y-1">
              {viewers.data.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 text-[10px]">
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      entry.isAnonymous ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}
                  >
                    <HugeiconsIcon
                      icon={entry.isAnonymous ? Anonymous : UserIcon}
                      strokeWidth={2.25}
                      className="h-2.5 w-2.5"
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {entry.isAnonymous ? "Anonymous visitor" : (entry.viewerName ?? entry.viewerEmail)}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground/70">{timeAgo(entry.viewedAt)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {detailsHref && (
            <Link href={detailsHref} className="block text-[10px] font-semibold text-primary hover:underline">
              View full analytics &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
