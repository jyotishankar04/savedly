"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShuffleIcon as Shuffle,
  SparklesIcon as Sparkles,
  Calendar03Icon as Calendar,
  ArrowRight01Icon as ArrowRight,
  Tag01Icon as TagIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMemoriesQuery, useTagsQuery } from "@/context/MemoryContext";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { QueryErrorState } from "@/components/query-error-state";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { Reveal } from "@/components/ui/reveal";
import type { Memory, MemoryType } from "@/types/memory";
import { PageHeader, EmptyState } from "@/components/app-page";

const TYPE_LABELS: Record<MemoryType, string> = {
  web: "Web pages",
  video: "Videos",
  note: "Notes",
  image: "Images",
  document: "Documents",
  voice: "Voice notes",
};

const TAG_COLOR_PALETTE = [
  "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15",
  "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15",
  "bg-pink-500/10 text-pink-500 border-pink-500/20 hover:bg-pink-500/15",
  "bg-teal-500/10 text-teal-500 border-teal-500/20 hover:bg-teal-500/15",
  "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15",
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15",
];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length];
}

function pickRandom(items: Memory[], excludeId?: string): Memory | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  let pick = items[Math.floor(Math.random() * items.length)];
  while (pick.id === excludeId) pick = items[Math.floor(Math.random() * items.length)];
  return pick;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// There's no view/open tracking anywhere in this app (confirmed against the
// schema) — createdAt/updatedAt are the only timestamps a memory has. So
// "was it ever touched again after saving" is the closest available proxy
// for "forgotten," and richness (favorited, tagged, collected) is the
// proxy for "valuable." Both feed one combined ranking below rather than
// two separate lists, since what actually matters is memories that are
// BOTH — worth seeing again and at risk of being missed.
function daysBetween(from: string | number, to: string | number): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS;
}

/** True once only the async ingestion pipeline's own writes (which land
 * within minutes of capture) explain the gap between createdAt/updatedAt —
 * i.e. the user has never come back to edit, tag, favorite, or move this
 * memory since saving it. */
function untouchedSinceCapture(item: Memory): boolean {
  return daysBetween(item.createdAt, item.updatedAt) < 1;
}

function richness(item: Memory): number {
  return item.tags.length + item.collections.length + (item.isFavorite ? 2 : 0);
}

/** Higher = more "worth resurfacing." Age matters but with diminishing
 * returns (log-scaled) so a two-year-old memory isn't treated as
 * infinitely more urgent than a two-month-old one; richer/favorited
 * memories outrank plain-old ones at the same age; never-touched-again
 * memories get a boost over ones the user clearly came back to already. */
function rediscoveryScore(item: Memory, now: number): number {
  const ageDays = Math.max(0, daysBetween(item.createdAt, now));
  const neglectBonus = untouchedSinceCapture(item) ? 1.5 : 1;
  return Math.log2(ageDays + 2) * neglectBonus * (1 + richness(item) * 0.6);
}

function rediscoveryReason(item: Memory, now: number): string {
  const ageDays = Math.round(daysBetween(item.createdAt, now));
  const ageLabel = ageDays >= 60 ? `${Math.round(ageDays / 30)} months ago` : `${ageDays} days ago`;
  const signals: string[] = [];
  if (item.isFavorite) signals.push("Favorited");
  if (item.collections.length > 0) signals.push(`in ${item.collections.length} collection${item.collections.length > 1 ? "s" : ""}`);
  if (item.tags.length > 0) signals.push(`tagged ${item.tags.length}×`);
  const base = signals.length > 0 ? signals.join(", ") : "Saved";
  return untouchedSinceCapture(item) ? `${base} · ${ageLabel}, never revisited` : `${base} · ${ageLabel}`;
}

export default function ExplorePage() {
  // Discovery only ever works over what's already been fetched — the API
  // has no random/oldest-first mode, so this pulls the most recent 100
  // (the max page size) and does every "surprise"/"forgotten"/"by type"
  // slice client-side, same trade-off the original page already made.
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ limit: 100 });
  const { data: tags = [] } = useTagsQuery();
  const items = React.useMemo(() => data?.items ?? [], [data]);

  const [surpriseId, setSurpriseId] = React.useState<string | null>(null);
  // Seed the first pick from render, not an effect — this only fires once,
  // the moment the data first arrives, and never loops since `surpriseId`
  // is non-null on every subsequent render.
  if (surpriseId === null && items.length > 0) {
    setSurpriseId(pickRandom(items)?.id ?? null);
  }
  const surprise = items.find((m) => m.id === surpriseId) ?? null;

  const onThisDay = React.useMemo(() => {
    const today = new Date();
    return items.filter((m) => {
      const d = new Date(m.createdAt);
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() !== today.getFullYear();
    });
  }, [items]);

  const MIN_AGE_DAYS_TO_QUALIFY = 3;
  const worthRevisiting = React.useMemo(() => {
    const now = new Date().getTime();
    return items
      .filter((item) => daysBetween(item.createdAt, now) >= MIN_AGE_DAYS_TO_QUALIFY)
      .map((item) => ({ item, score: rediscoveryScore(item, now), reason: rediscoveryReason(item, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [items]);

  const typeCounts = React.useMemo(() => {
    const counts: Partial<Record<MemoryType, number>> = {};
    for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, [items]);
  const [selectedType, setSelectedType] = React.useState<MemoryType | null>(null);
  const byType = React.useMemo(() => (selectedType ? items.filter((m) => m.type === selectedType) : []), [items, selectedType]);

  const topTags = React.useMemo(() => [...tags].sort((a, b) => b.memoryCount - a.memoryCount).slice(0, 12), [tags]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Explore" description="A few ways to rediscover what's already in your library." />

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing to explore yet" description="Save a few memories and this page will fill up with ways to revisit them." />
      ) : (
        <>
          {/* Surprise me */}
          {surprise && (
            <Reveal>
              <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                  <div className="w-full shrink-0 sm:w-40">
                    <MemoryThumbnail item={surprise} className="rounded-xl" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                      <HugeiconsIcon icon={Sparkles} strokeWidth={2} className="h-3 w-3" /> Surprise pick
                    </span>
                    <h3 className="line-clamp-1 text-base font-medium text-foreground">{surprise.title}</h3>
                    {surprise.description && <p className="line-clamp-2 text-sm text-muted-foreground">{surprise.description}</p>}
                    <div className="flex items-center gap-3 pt-1">
                      <Link href={`/app/memories/${surprise.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Revisit memory <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-3.5 w-3.5" />
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSurpriseId((current) => pickRandom(items, current ?? undefined)?.id ?? current)}
                        className="h-8 rounded-full px-3 text-xs font-medium"
                      >
                        <HugeiconsIcon icon={Shuffle} strokeWidth={2} className="h-3.5 w-3.5" /> Shuffle
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </Reveal>
          )}

          {/* On this day */}
          {onThisDay.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Calendar} strokeWidth={2} className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">On this day</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {onThisDay.map((item) => (
                  <MemoryGridCard key={item.id} item={item} href={`/app/memories/${item.id}`} />
                ))}
              </div>
            </section>
          )}

          {/* Browse by type */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-foreground">Browse by type</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as MemoryType[])
                .filter((type) => (typeCounts[type] ?? 0) > 0)
                .map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType((current) => (current === type ? null : type))}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                      selectedType === type ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-muted",
                    )}
                  >
                    <HugeiconsIcon icon={MEMORY_TYPE_ICONS[type]} strokeWidth={2} className="h-4 w-4" />
                    {TYPE_LABELS[type]}
                    <span className="text-xs text-muted-foreground/80">{typeCounts[type]}</span>
                  </button>
                ))}
            </div>

            {selectedType && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {byType.map((item) => (
                  <MemoryGridCard key={item.id} item={item} href={`/app/memories/${item.id}`} />
                ))}
              </div>
            )}
          </section>

          {/* Tags to explore */}
          {topTags.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Tags to explore</h2>
                <Link href="/app/tags" className="text-sm font-medium text-primary hover:underline">
                  View all &rarr;
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/app/tags/${encodeURIComponent(tag.name)}`}
                    className={cn("group flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors", colorFor(tag.id))}
                  >
                    <HugeiconsIcon icon={TagIcon} strokeWidth={2} className="h-3.5 w-3.5" />
                    {tag.name}
                    <span className="text-xs opacity-70">{tag.memoryCount}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Worth revisiting — ranks memories that are both old/untouched
              (forgotten) and favorited/tagged/collected (valuable), rather
              than just the plain-oldest saves. */}
          {worthRevisiting.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">Worth revisiting</h2>
                <p className="text-[13px] text-muted-foreground">Memories that look valuable and haven&apos;t come up again in a while.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {worthRevisiting.map(({ item, reason }) => (
                  <div key={item.id} className="space-y-1.5">
                    <MemoryGridCard item={item} href={`/app/memories/${item.id}`} />
                    <p className="truncate px-0.5 text-xs text-muted-foreground">{reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
