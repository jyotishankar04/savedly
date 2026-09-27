"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { timeAgo, timelineGroup } from "@/lib/time";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import type { Memory } from "@/types/memory";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";

export default function RecentPage() {
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ limit: 60 });
  const items = data?.items ?? [];

  // Group into timeline buckets in the order items already arrive (createdAt desc from the API).
  const groupedEntries: { group: string; items: Memory[] }[] = [];
  for (const item of items) {
    const group = timelineGroup(item.createdAt);
    let bucket = groupedEntries.find((g) => g.group === group);
    if (!bucket) {
      bucket = { group, items: [] };
      groupedEntries.push(bucket);
    }
    bucket.items.push(item);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Recent" description="Your latest saves, most recent first — pick up where you left off." />

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing saved yet" description="Capture a link, note or file to see your timeline come to life." />
      ) : (
        <div className="space-y-8">
          {groupedEntries.map(({ group, items: groupItems }) => (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`} className="mb-2 text-sm font-medium text-muted-foreground">
                {group}
              </h2>
              <ul className="space-y-1.5">
                {groupItems.map((item) => {
                  const TypeIcon = MEMORY_TYPE_ICONS[item.type];
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/app/memories/${item.id}`}
                        className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                          {item.faviconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain favicon
                            <img src={item.faviconUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
                          ) : (
                            <HugeiconsIcon icon={TypeIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{item.title}</p>
                          <p className="truncate text-[13px] text-muted-foreground">{item.description || item.source}</p>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeAgo(item.createdAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
