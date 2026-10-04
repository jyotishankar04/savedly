"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon as Search,
  XIcon as X,
  CheckIcon as Check,
  ArrowRight01Icon as ArrowRight,
  Clock01Icon as Clock,
  ArrowDown01Icon as ChevronDown,
} from "@hugeicons/core-free-icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LogoMark } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { listMemories, type ListMemoriesParams } from "@/lib/memories";
import { memoriesQueryKey, useCollectionsQuery } from "@/context/MemoryContext";
import { useInsightsQuery } from "@/hooks/use-insights";
import { humanizeLabel } from "@/lib/insights";
import { timeAgo } from "@/lib/time";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { QueryErrorState } from "@/components/query-error-state";
import { cn } from "@/lib/utils";
import type { Collection, Memory, MemoryType } from "@/types/memory";

const TYPE_FILTERS: { id: string; label: string; type?: MemoryType }[] = [
  { id: "all", label: "All" },
  { id: "links", label: "Websites", type: "web" },
  { id: "notes", label: "Notes", type: "note" },
  { id: "videos", label: "Videos", type: "video" },
  { id: "images", label: "Images", type: "image" },
  { id: "files", label: "Files", type: "document" },
];

const TYPE_LABEL: Record<MemoryType, string> = {
  web: "Website",
  note: "Note",
  video: "Video",
  image: "Image",
  document: "File",
  voice: "Voice memo",
};

const DEFAULT_EXAMPLES = [
  "landing page inspiration",
  "that article about vector databases",
  "pricing page design references",
  "videos about building a SaaS",
];

// Recent searches are a per-browser convenience only.
const RECENT_KEY = "sfl:recent-searches";
const RECENT_MAX = 6;

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Marks the query's words where they literally appear (results are semantic, so many won't). */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-primary/15 px-0.5 text-inherit">{part}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [typeFilter, setTypeFilter] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const { data: collections = [] } = useCollectionsQuery();
  const { data: insights } = useInsightsQuery();

  useEffect(() => {
    function syncFromUrl() {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
    syncFromUrl();
  }, [urlQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const trimmedQuery = debouncedQuery.trim();
  const params: ListMemoriesParams = {
    q: trimmedQuery,
    limit: 50,
    type: TYPE_FILTERS.find((f) => f.id === typeFilter)?.type,
    isFavorite: favoriteOnly || undefined,
    collectionId: collectionId ?? undefined,
  };
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: memoriesQueryKey(params),
    queryFn: () => listMemories(params),
    enabled: trimmedQuery.length > 0,
    // Keep the last results on screen while the next query runs, instead of
    // flashing skeletons on every keystroke.
    placeholderData: keepPreviousData,
  });
  const results = data?.items ?? [];
  const hasSearched = trimmedQuery.length > 0;
  const hasActiveFilters = typeFilter !== "all" || favoriteOnly || Boolean(collectionId);
  const terms = [...new Set(trimmedQuery.toLowerCase().split(/\s+/).filter((t) => t.length >= 3))];

  const topTags = insights?.topTags.slice(0, 4) ?? [];
  const examples = topTags.length >= 2 ? topTags.map((t) => humanizeLabel(t.label).toLowerCase()) : DEFAULT_EXAMPLES;

  const remember = (q: string) => {
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
    setRecent(next);
    writeRecent(next);
  };

  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setQuery(q);
    remember(q);
    router.push(`/app/search?q=${encodeURIComponent(q)}`);
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setFavoriteOnly(false);
    setCollectionId(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Search</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Describe it the way you remember it. Results match meaning, not just exact words.
        </p>
      </header>

      {/* Search box */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="relative flex items-center"
      >
        <HugeiconsIcon icon={Search} strokeWidth={2} className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          autoFocus={!urlQuery}
          aria-label="Search your memory"
          placeholder="What are you looking for?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-14 text-[15px] text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              router.push("/app/search");
              inputRef.current?.focus();
            }}
            className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={X} strokeWidth={2} className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filters: all optional, combined with the query */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filters">
        {TYPE_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={typeFilter === tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={cn(
              "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
              typeFilter === tab.id
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}

        <span aria-hidden className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          aria-pressed={favoriteOnly}
          onClick={() => setFavoriteOnly((prev) => !prev)}
          className={cn(
            "flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors",
            favoriteOnly
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {favoriteOnly && <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-3.5 w-3.5" />} Favorites
        </button>

        {collections.length > 0 && (
          <CollectionFilter collections={collections} value={collectionId} onChange={setCollectionId} />
        )}

        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <HugeiconsIcon icon={X} strokeWidth={2} className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Before searching: recent searches and ideas */}
      {!hasSearched && (
        <div className="grid gap-8 pt-2 md:grid-cols-2">
          {recent.length > 0 && (
            <section aria-labelledby="recent-searches">
              <div className="flex items-center justify-between">
                <h2 id="recent-searches" className="text-sm font-medium text-muted-foreground">Recent searches</h2>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    writeRecent([]);
                  }}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <ul className="mt-2 space-y-0.5">
                {recent.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => runSearch(q)}
                      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <HugeiconsIcon icon={Clock} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{q}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="search-ideas" className={cn(recent.length === 0 && "md:col-span-2")}>
            <h2 id="search-ideas" className="text-sm font-medium text-muted-foreground">
              {topTags.length >= 2 ? "Topics you save most" : "Try searching for"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => runSearch(q)}
                  className="rounded-full border border-border bg-card/60 px-3.5 py-2 text-sm text-foreground/85 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {hasSearched && isError && !data && <QueryErrorState onRetry={() => refetch()} />}

      {/* First load for a query: skeleton rows */}
      {hasSearched && isPending && !data && (
        <div className="space-y-3" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="aspect-video w-28 shrink-0 rounded-xl sm:w-40" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSearched && data && (
        <section aria-labelledby="results-heading" className={cn("space-y-3 transition-opacity", isFetching && "opacity-60")} aria-busy={isFetching}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="results-heading" className="text-sm text-muted-foreground" aria-live="polite">
              {results.length === 0 ? (
                "No matches"
              ) : (
                <>
                  <span className="font-medium text-foreground">{results.length === 50 ? "50+" : results.length}</span>{" "}
                  {results.length === 1 ? "result" : "results"} for &ldquo;{trimmedQuery}&rdquo;
                </>
              )}
            </h2>
            {results.length > 0 && (
              <Link
                href={`/app/ask?q=${encodeURIComponent(trimmedQuery)}`}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <LogoMark ticks={false} className="h-4 w-4" /> Ask about this instead
              </Link>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-[15px] font-medium text-foreground">Nothing matched &ldquo;{trimmedQuery}&rdquo;</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Your filters may be hiding it. Clear them, or describe it differently."
                  : "Try describing it differently, or a broader topic. Ask can also dig through your library for you."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters} className="h-10 rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-muted">
                    Clear filters
                  </button>
                )}
                <Link
                  href={`/app/ask?q=${encodeURIComponent(trimmedQuery)}`}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  <LogoMark ticks={false} className="h-4 w-4 rounded-sm bg-white/90" /> Ask SaveForLatter
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={item.id}>
                  <ResultRow item={item} terms={terms} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Searchable, since people end up with dozens of collections and long names. */
function CollectionFilter({
  collections,
  value,
  onChange,
}: {
  collections: Collection[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = collections.find((c) => c.id === value);
  const sorted = [...collections].sort((a, b) => a.name.localeCompare(b.name));
  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 max-w-56 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
          selected ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
        )}
      >
        {selected ? (
          <>
            <span aria-hidden>{selected.icon}</span>
            <span className="min-w-0 truncate">{selected.name}</span>
          </>
        ) : (
          "Collection"
        )}
        <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <Command>
          <CommandInput placeholder="Find a collection…" className="text-sm" />
          <CommandList className="max-h-80">
            <CommandEmpty className="text-sm text-muted-foreground">No collection with that name.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="any collection" data-checked={!value} onSelect={() => pick(null)} className="py-2 text-sm">
                Any collection
              </CommandItem>
              {sorted.map((col) => (
                <CommandItem
                  key={col.id}
                  value={`${col.name} ${col.id}`}
                  data-checked={value === col.id}
                  onSelect={() => pick(col.id)}
                  title={col.name}
                  className="py-2 text-sm"
                >
                  <span aria-hidden className="w-5 shrink-0 text-center">{col.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{col.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{col.memoryCount}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ResultRow({ item, terms }: { item: Memory; terms: string[] }) {
  const host = hostOf(item.url);
  const meta = [TYPE_LABEL[item.type], host ?? item.source, item.collections[0]?.name].filter(Boolean) as string[];
  return (
    <Link
      href={`/app/memories/${item.id}`}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="w-28 shrink-0 sm:w-40">
        <MemoryThumbnail item={item} className="rounded-xl" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          <Highlight text={item.title} terms={terms} />
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            <Highlight text={item.description} terms={terms} />
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{meta.join(" · ")}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums">
            {timeAgo(item.createdAt)}
            <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
      </div>
    </Link>
  );
}
