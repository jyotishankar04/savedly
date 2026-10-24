"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus, Search01Icon as Search, XIcon as X, GridIcon as Grid, ListIcon as List } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MemoryListRow } from "@/components/memory/memory-list-row";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { MemorySelectionBar } from "@/components/selection/memory-selection-bar";
import { SelectButton } from "@/components/selection/selection-bar";
import { useSelection } from "@/hooks/use-selection";
import { usePinch } from "@/hooks/use-pinch";
import type { Memory, MemoryType } from "@/types/memory";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { timelineGroup } from "@/lib/time";
import { isMemoryProcessing } from "@/lib/memory-processing";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { getPlatformFallback } from "@/lib/platform-fallback";
import { QueryErrorState } from "@/components/query-error-state";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice, LimitDot } from "@/components/plan-limit-notice";
import { MemorySwipe } from "@/components/memory/memory-swipe";
import { PageHeader, EmptyState } from "@/components/app-page";

const FILTER_TYPE: Record<string, MemoryType | undefined> = {
  all: undefined,
  links: "web",
  notes: "note",
  videos: "video",
  images: "image",
  files: "document",
};

export default function MemoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // On a phone the small cards (list view there) are the default. Set after the
  // first render, so the server's and the browser's first render match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(max-width: 639px)").matches) setViewMode("list");
  }, []);
  // Pinch to switch, on a touch screen: spread for the full cards, close for the smaller ones.
  const pageRef = useRef<HTMLDivElement>(null);
  usePinch(pageRef, { onPinchOut: () => setViewMode("grid"), onPinchIn: () => setViewMode("list") });
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useMemoriesQuery({
    type: FILTER_TYPE[currentFilter],
    q: searchQuery.trim() || undefined,
    limit: 100,
  });
  const memories = data?.items ?? [];
  const memoryLimit = usePlanLimit("memory_count");
  // Bulk selection: in the order the page shows them, for Shift+click ranges.
  const selection = useSelection(memories.map((m) => m.id));
  // Derived from the live (auto-refetching) list rather than a frozen
  // snapshot, so the drawer picks up enrichment as soon as it lands instead
  // of staying stuck on "Still processing" until it's closed and reopened.
  const selectedMemory = memories.find((m) => m.id === selectedMemoryId) ?? null;


  // Group into timeline buckets in the order items already arrive (createdAt desc from the API).
  const groupedEntries: { group: string; items: Memory[] }[] = [];
  for (const item of memories) {
    const group = timelineGroup(item.createdAt);
    let bucket = groupedEntries.find((g) => g.group === group);
    if (!bucket) {
      bucket = { group, items: [] };
      groupedEntries.push(bucket);
    }
    bucket.items.push(item);
  }

  return (
    <div ref={pageRef} className="flex h-full w-full overflow-hidden relative">

      {/* Memories content list */}
      <ScrollArea className="flex-1 min-h-0 min-w-0">
      <div className="px-4 py-8 sm:px-6 md:py-10 space-y-6">

        <div className="mx-auto md:max-w-10/12 space-y-6">
          <PageHeader
            title="Memories"
            description={`${memories.length} ${memories.length === 1 ? "save" : "saves"} in your library`}
            dataTour="memories-header"
            action={
              <Link
                href="/app"
                title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "relative h-10 rounded-full px-4 text-sm font-medium flex items-center gap-1.5"
                )}
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-4 w-4" /> Save
                {memoryLimit.isAtLimit && <LimitDot />}
              </Link>
            }
          />

          {memoryLimit.isAtLimit && (
            <PlanLimitNotice message={memoryLimit.message ?? "You've reached your memory limit."} />
          )}

          {/* Toolbar */}
          <div className="flex flex-col gap-4">
            <div className="relative flex w-full max-w-sm items-center">
              <HugeiconsIcon icon={Search} strokeWidth={2} className="absolute left-3.5 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search your memories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 rounded-xl text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            {/* Filters pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "All" },
                { id: "links", label: "Websites" },
                { id: "notes", label: "Notes" },
                { id: "videos", label: "Videos" },
                { id: "images", label: "Images" },
                { id: "files", label: "Files" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentFilter(tab.id)}
                  className={cn(
                    "h-8 px-3 rounded-full text-[13px] font-medium border transition-all text-nowrap select-none",
                    currentFilter === tab.id
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
            <SelectButton selection={selection} />
            {/* View selectors */}
            <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
                className={cn("p-2 hover:bg-muted transition-colors", viewMode === "grid" ? "text-primary bg-primary/5" : "text-muted-foreground")}
              >
                <HugeiconsIcon icon={Grid} strokeWidth={2} className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
                className={cn("p-2 hover:bg-muted transition-colors", viewMode === "list" ? "text-primary bg-primary/5" : "text-muted-foreground")}
              >
                <HugeiconsIcon icon={List} strokeWidth={2} className="h-4 w-4" />
              </button>
            </div>
            </div>
            </div>
          </div>
        </div>

        {/* Timeline body items */}
        <div className="mx-auto md:max-w-10/12">
        {isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className={cn("pt-4", viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2")}>
            {Array.from({ length: viewMode === "grid" ? 9 : 6 }).map((_, i) =>
              viewMode === "grid" ? (
                <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ) : (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : memories.length > 0 ? (
          <div className="space-y-8 pt-2">
            {groupedEntries.map(({ group, items: groupItems }) => (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2 id={`group-${group}`} className="mb-3 text-sm font-medium text-muted-foreground">
                  {group}
                </h2>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groupItems.map((item) => (
                      <MemorySwipe key={item.id} memory={item} disabled={selection.isSelecting} className="rounded-2xl">
                        <MemoryGridCard
                          item={item}
                          onClick={() => setSelectedMemoryId(item.id)}
                          selected={selection.has(item.id)}
                          selecting={selection.isSelecting}
                          onSelect={(e) => selection.toggle(item.id, e)}
                        />
                      </MemorySwipe>
                    ))}
                  </div>
                ) : (
                  <>
                  {/* On a phone the list is smaller cards, two to a row; rows from sm up. */}
                  <div className="grid grid-cols-2 gap-2.5 sm:hidden">
                    {groupItems.map((item) => (
                      <MemorySwipe key={item.id} memory={item} disabled={selection.isSelecting} className="rounded-xl">
                        <MemoryGridCard
                          item={item}
                          compact
                          onClick={() => setSelectedMemoryId(item.id)}
                          selected={selection.has(item.id)}
                          selecting={selection.isSelecting}
                          onSelect={(e) => selection.toggle(item.id, e)}
                        />
                      </MemorySwipe>
                    ))}
                  </div>
                  <ul className="hidden space-y-1.5 sm:block">
                    {groupItems.map((item) => (
                      <li key={item.id}>
                        <MemorySwipe memory={item} disabled={selection.isSelecting} className="rounded-xl">
                          <MemoryListRow
                            item={item}
                            onOpen={() => setSelectedMemoryId(item.id)}
                            selected={selection.has(item.id)}
                            selecting={selection.isSelecting}
                            onSelect={(e) => selection.toggle(item.id, e)}
                          />
                        </MemorySwipe>
                      </li>
                    ))}
                  </ul>
                  </>
                )}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No saves match your filters" description="Try clearing the type filter or your search query." className="mt-4" />
        )}
        </div>

      </div>
      </ScrollArea>

      {/* DETAIL SLIDE DRAWER: beside the list from sm up; on a phone, too narrow
          for both, it covers the screen (above the bottom bar) until closed. */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex w-full flex-col bg-card animate-slide-left sm:relative sm:inset-auto sm:z-40 sm:w-96 sm:shrink-0 sm:border-l sm:border-border">

          <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{selectedMemory.title}</h3>
              <span className="text-xs text-muted-foreground truncate block">{selectedMemory.source}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMemoryId(null)}
              aria-label="Close preview"
              className="h-10 w-10 sm:h-7 sm:w-7 shrink-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
            >
              <HugeiconsIcon icon={X} strokeWidth={2.25} className="h-4 w-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 min-h-0 min-w-0">
          <div className="p-5 space-y-6 text-[13px] leading-relaxed">

            <MemoryThumbnail item={selectedMemory} className="rounded-lg" />

            {/* Plain-language preview status — never the raw fetchStatus (see docs/URL_CAPTURE_AND_PREVIEW.md's UI copy guidance). */}
            {!isMemoryProcessing(selectedMemory) && selectedMemory.previewStatus && selectedMemory.previewStatus !== "available" && (
              <p className="text-xs text-muted-foreground -mt-3">
                {selectedMemory.previewSource === "browser"
                  ? "Preview captured from your browser."
                  : `Preview unavailable${selectedMemory.platform ? ` · ${getPlatformFallback(selectedMemory.platform).label}` : ""}.`}
              </p>
            )}

            {selectedMemory.description && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <p className="text-[13px] text-foreground/90">{selectedMemory.description}</p>
              </div>
            )}
            <div className="pt-4">
              <Link
                href={`/app/memories/${selectedMemory.id}`}
              >
                <Button className="w-full py-4 cursor-pointer font-bold">
                  Open detailed view &rarr;
                </Button>
              </Link>
            </div>
            {selectedMemory.tags.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <span className="text-xs font-medium text-muted-foreground block">Tags</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedMemory.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center gap-1.5 text-primary">
                <LogoMark ticks={false} className="h-4 w-4" />
                <span className="text-xs font-medium">AI summary</span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {selectedMemory.inferredIntent ??
                  (isMemoryProcessing(selectedMemory)
                    ? "Still processing — this updates automatically in a few seconds."
                    : "No AI summary available for this memory.")}
              </p>
            </div>

            {selectedMemory.extractedFields && Object.keys(selectedMemory.extractedFields).length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <span className="text-xs font-medium text-muted-foreground block">
                  {selectedMemory.contentType ? selectedMemory.contentType.replace(/_/g, " ") : "Details"}
                </span>
                <dl className="space-y-1.5">
                  {Object.entries(selectedMemory.extractedFields).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-3">
                      <dt className="text-xs text-muted-foreground shrink-0 capitalize">
                        {key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}
                      </dt>
                      <dd className="text-[13px] text-foreground/90 font-medium text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            

          </div>
          </ScrollArea>
        </div>
      )}

      {/* Drawer animations CSS */}
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-left {
          animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <MemorySelectionBar selection={selection} memories={memories} context="library" />
    </div>
  );
}
