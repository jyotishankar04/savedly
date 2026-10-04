"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  StickyNote01Icon as StickyNote,
  Search01Icon as Search,
  ArrowRight01Icon as ArrowRight,
  XIcon as X,
  Link01Icon as LinkIcon,
  Upload01Icon as Upload,
  PuzzleIcon as Puzzle,
  HistoryIcon as History,
  PlusSignIcon as Plus,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/context/UserContext";
import { useMemoriesQuery, useCollectionsQuery } from "@/context/MemoryContext";
import { useInsightsQuery } from "@/hooks/use-insights";
import { humanizeLabel } from "@/lib/insights";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { QueryErrorState } from "@/components/query-error-state";
import type { Memory } from "@/types/memory";

const RECENT_COUNT = 6;
const COLLECTION_COUNT = 6;
const REDISCOVER_AFTER_DAYS = 30;

const DEFAULT_EXAMPLES = [
  "websites I saved for dashboard inspiration",
  "videos about building a SaaS",
  "that article about vector databases",
];

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function openQuickCapture() {
  window.dispatchEvent(new CustomEvent("capture:open"));
}

/** One older save, stable for the whole day so it doesn't reshuffle on every visit. */
function pickRediscovery(items: Memory[]): Memory | null {
  const cutoff = Date.now() - REDISCOVER_AFTER_DAYS * 864e5;
  const older = items.filter((m) => new Date(m.createdAt).getTime() < cutoff);
  if (older.length === 0) return null;
  const day = Math.floor(Date.now() / 864e5);
  return older[day % older.length];
}

/** Saves per day for the last 7 days, oldest first. */
function lastSevenDays(activity: { date: string; count: number }[]) {
  const byDate = new Map(activity.map((d) => [d.date, d.count]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), count: byDate.get(key) ?? 0 };
  });
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUser();
  const firstName = (user.name ?? user.email).split(/\s+/)[0];
  const greeting = greetingForHour(new Date().getHours());

  // One page of saves feeds both "Recently saved" and the rediscovery pick.
  const { data: memoriesResult, isLoading: memoriesLoading, isError: memoriesError, refetch: refetchMemories } = useMemoriesQuery({ limit: 60 });
  const { data: collections = [], isLoading: collectionsLoading, isError: collectionsError, refetch: refetchCollections } = useCollectionsQuery();
  const { data: insights } = useInsightsQuery();

  const items = useMemo(() => memoriesResult?.items ?? [], [memoriesResult]);
  const recent = items.slice(0, RECENT_COUNT);
  const rediscovery = useMemo(() => pickRediscovery(items), [items]);
  const topCollections = useMemo(
    () => [...collections].sort((a, b) => b.memoryCount - a.memoryCount).slice(0, COLLECTION_COUNT),
    [collections],
  );
  const topTags = insights?.topTags.slice(0, 5) ?? [];
  const examples = topTags.length >= 2 ? topTags.slice(0, 3).map((t) => `things I saved about ${humanizeLabel(t.label).toLowerCase()}`) : DEFAULT_EXAMPLES;
  const isEmpty = !memoriesLoading && !memoriesError && items.length === 0;

  const search = (q: string) => {
    const query = q.trim();
    if (query) router.push(`/app/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 md:py-10">
      {/* Greeting */}
      <header className="space-y-1.5" data-tour="greeting">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
          {greeting}, {firstName}.
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {insights && insights.totals.memories > 0 ? (
            <>
              {insights.totals.memories.toLocaleString()} {insights.totals.memories === 1 ? "save" : "saves"} in your library
              {insights.totals.thisWeek > 0 && <>, {insights.totals.thisWeek} this week</>}.
            </>
          ) : (
            "Save something now, find it again whenever you need it."
          )}
        </p>
      </header>

      {/* Search */}
      <section className="max-w-3xl space-y-3" data-tour="home-search" aria-label="Search your library">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            search(searchQuery);
          }}
          className="relative flex items-center"
        >
          <HugeiconsIcon icon={Search} strokeWidth={2} className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search your memory"
            placeholder="Search by what you remember about it…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-24 text-[15px] text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={X} strokeWidth={2} className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:bg-muted disabled:text-muted-foreground"
            >
              Search
            </button>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Try</span>
          {examples.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => search(q)}
              className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[13px] text-foreground/85 transition-colors hover:border-primary/30 hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Quick save */}
      <section aria-labelledby="home-save" className="space-y-3">
        <h2 id="home-save" className="text-sm font-medium text-muted-foreground">Save something</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SaveAction icon={LinkIcon} label="Save a link" sub="Paste any URL" onClick={openQuickCapture} />
          <SaveAction icon={StickyNote} label="Write a note" sub="Capture a thought" onClick={openQuickCapture} />
          <SaveAction icon={Upload} label="Upload a file" sub="Image, PDF or screenshot" onClick={openQuickCapture} />
          <SaveAction icon={Puzzle} label="Browser extension" sub="Save from any page" href="/app/integrations" />
        </div>
      </section>

      {/* Recently saved */}
      <section aria-labelledby="home-recent" className="space-y-3">
        <SectionHeader id="home-recent" title="Recently saved" href={items.length > 0 ? "/app/memories" : undefined} />
        {memoriesError ? (
          <QueryErrorState onRetry={() => refetchMemories()} />
        ) : isEmpty ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-medium text-foreground">Nothing saved yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Save a link, a note or a screenshot. It&apos;s summarized, tagged and filed for you.</p>
            </div>
            <button
              type="button"
              onClick={openQuickCapture}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-4 w-4" /> Save your first memory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memoriesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              : recent.map((item) => <MemoryCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      {/* This week + rediscover */}
      {!isEmpty && (insights || rediscovery) && (
        <section className={cn("grid gap-4", insights && rediscovery && "md:grid-cols-2")}>
          {insights && <WeekCard insights={insights} tags={topTags} />}
          {rediscovery && <RediscoverCard item={rediscovery} />}
        </section>
      )}

      {/* Collections */}
      <section aria-labelledby="home-collections" className="space-y-3">
        <SectionHeader id="home-collections" title="Your collections" href={collections.length > 0 ? "/app/collections" : undefined} />
        {collectionsError ? (
          <QueryErrorState onRetry={() => refetchCollections()} />
        ) : collectionsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Collections appear here as your saves get organized.{" "}
            <Link href="/app/collections" className="font-medium text-primary hover:underline">Create one yourself</Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topCollections.map((col) => (
              <Link
                key={col.id}
                href={`/app/collections/${col.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">{col.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{col.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {col.memoryCount} {col.memoryCount === 1 ? "save" : "saves"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-sm font-medium text-muted-foreground">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
          View all <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function SaveAction({ icon, label, sub, onClick, href }: { icon: IconSvgElement; label: string; sub: string; onClick?: () => void; href?: string }) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
    </>
  );
  const className =
    "group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  return href ? (
    <Link href={href} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  );
}

function MemoryCard({ item }: { item: Memory }) {
  return (
    <Link
      href={`/app/memories/${item.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <MemoryThumbnail item={item} className="rounded-xl" />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{item.collections[0]?.name ?? item.tags[0] ?? ""}</span>
          <span className="shrink-0 tabular-nums">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function WeekCard({ insights, tags }: { insights: NonNullable<ReturnType<typeof useInsightsQuery>["data"]>; tags: { label: string; count: number }[] }) {
  const days = lastSevenDays(insights.activity);
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted-foreground">This week</h2>
      <div className="mt-3 flex items-end justify-between gap-6">
        <p>
          <span className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">{insights.totals.thisWeek}</span>
          <span className="ml-2 text-sm text-muted-foreground">{insights.totals.thisWeek === 1 ? "save" : "saves"}</span>
        </p>
        <div className="flex h-14 items-end gap-1.5" role="img" aria-label={`Saves per day: ${days.map((d) => d.count).join(", ")}`}>
          {days.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <div
                className={cn("w-3 rounded-sm", d.count > 0 ? "bg-primary" : "bg-muted")}
                style={{ height: `${Math.max(4, (d.count / max) * 40)}px` }}
              />
              <span className="text-[10px] leading-none text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">You save most about</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t.label}
                href={`/app/tags/${encodeURIComponent(t.label)}`}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {humanizeLabel(t.label)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Link href="/app/insights" className="mt-4 flex w-fit items-center gap-0.5 text-sm font-medium text-primary hover:underline">
        See insights <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4" />
      </Link>
    </div>
  );
}

function RediscoverCard({ item }: { item: Memory }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <HugeiconsIcon icon={History} strokeWidth={2} className="h-4 w-4" /> From your archive
      </h2>
      <Link
        href={`/app/memories/${item.id}`}
        className="group mt-3 flex flex-1 gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="w-32 shrink-0 sm:w-36">
          <MemoryThumbnail item={item} className="rounded-xl" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">{item.title}</p>
          {item.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
        </div>
      </Link>
    </div>
  );
}
