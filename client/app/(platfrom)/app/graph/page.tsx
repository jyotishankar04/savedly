"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { BarChartIcon as BarChart2, XIcon as X, PlusIcon as Plus } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/query-error-state";
import { MemoryPreviewCard } from "@/components/memory-preview-card";
import { useMemoryGraphQuery } from "@/hooks/use-memory-graph";
import { getMemory } from "@/lib/memories";
import { MEMORY_TYPE_COLORS } from "@/lib/memory-type-colors";
import { EDGE_KIND_LABEL, type GraphEdgeKind } from "@/lib/memory-graph";
import type { MemoryType } from "@/types/memory";

// Canvas + force simulation can't run server-side, and nothing else in this
// codebase has needed a client-only chunk before.
const MemoryGraphCanvas = dynamic(
  () => import("@/components/memory-graph/memory-graph-canvas").then((mod) => mod.MemoryGraphCanvas),
  {
    ssr: false,
    loading: () => <GraphMessage title="Building your graph..." />,
  },
);

const NODE_LEGEND: MemoryType[] = ["web", "video", "note", "image", "document", "voice"];
const EDGE_LEGEND: GraphEdgeKind[] = ["semantic", "tag", "collection"];

export default function GraphPage() {
  const { data, isLoading, isError, refetch } = useMemoryGraphQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <QueryErrorState title="Couldn't load your graph" onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) return <GraphMessage title="Building your graph..." />;

  if (data.nodes.length < 2) {
    return (
      <GraphMessage
        title="Not enough saved yet"
        description="Your graph appears once you've saved a couple of things — it maps how your memories relate to each other."
        action
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MemoryGraphCanvas
        nodes={data.nodes}
        edges={data.edges}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Summary + legend */}
      <div className="pointer-events-none absolute left-4 top-4 space-y-2.5 text-[10px] font-semibold">
        <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-2 backdrop-blur-sm">
          <p className="text-foreground">
            {data.nodes.length} memories · {data.edges.length} connections
          </p>
          {data.truncated && (
            <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
              Showing your most recent {data.nodes.length}
            </p>
          )}
        </div>

        <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2 backdrop-blur-sm">
          <div className="flex flex-wrap gap-x-2.5 gap-y-1">
            {NODE_LEGEND.map((type) => (
              <span key={type} className="flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MEMORY_TYPE_COLORS[type] }} />
                {type}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-border/40 pt-1.5">
            {EDGE_LEGEND.map((kind) => (
              <span key={kind} className="flex items-center gap-1 text-muted-foreground">
                <span
                  aria-hidden
                  className="w-3.5 border-t border-muted-foreground/70"
                  style={{ borderTopStyle: kind === "semantic" ? "solid" : kind === "tag" ? "dashed" : "dotted" }}
                />
                {EDGE_KIND_LABEL[kind]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedId && <SelectedMemoryPanel memoryId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function SelectedMemoryPanel({ memoryId, onClose }: { memoryId: string; onClose: () => void }) {
  const { data: memory, isLoading, isError } = useQuery({
    queryKey: ["memories", memoryId],
    queryFn: () => getMemory(memoryId),
  });

  return (
    <aside className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected memory</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={X} strokeWidth={2.25} className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {isError && <p className="text-xs text-destructive">Couldn&apos;t load this memory.</p>}
        {memory && (
          <div className="space-y-3">
            <MemoryPreviewCard memory={memory} />
            {memory.collections.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Collections</p>
                <div className="flex flex-wrap gap-1">
                  {memory.collections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/app/collections/${collection.id}`}
                      className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {collection.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function GraphMessage({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-card shadow-md">
          <HugeiconsIcon icon={BarChart2} strokeWidth={2.25} className="h-7 w-7 text-primary" />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Memory Graph
        </span>
        <h1 className="pt-2 text-3xl font-medium leading-[1.15] tracking-tight text-foreground md:text-4xl">{title}</h1>
        {description && <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">{description}</p>}
      </div>

      {action && (
        <div className="pt-8">
          <Button
            render={<Link href="/app/capture" />}
            nativeButton={false}
            className="flex h-10 items-center gap-1.5 rounded-full px-6 font-medium shadow-xs"
            variant="outline"
          >
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" /> Save something
          </Button>
        </div>
      )}
    </div>
  );
}
