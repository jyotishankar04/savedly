"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as Search, ArrowLeft01Icon as ArrowLeft, Edit01Icon as Edit, GridIcon as Grid, ListIcon as List } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CollectionActionsMenu } from "@/components/collection/collection-actions-menu";
import { EditCollectionDialog } from "@/components/collection/edit-collection-dialog";
import { useCollectionsQuery, useMemoriesQuery } from "@/context/MemoryContext";
import { timeAgo } from "@/lib/time";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { QueryErrorState } from "@/components/query-error-state";

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editOpen, setEditOpen] = useState(false);

  const { data: collections = [] } = useCollectionsQuery();
  const collection = collections.find((c) => c.id === id);

  const { data, isLoading, isError, refetch } = useMemoriesQuery({ collectionId: id, q: searchQuery.trim() || undefined, limit: 100 });
  const memories = data?.items ?? [];

  if (!collection) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Collection not found</h2>
        <button onClick={() => router.push("/app/collections")} className="text-xs font-bold text-primary hover:underline">
          Back to collections
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 animate-fade-in">

      {/* Back button */}
      <button
        onClick={() => router.push("/app/collections")}
        className="text-xs font-semibold hover:text-primary flex items-center gap-1 text-muted-foreground transition-colors"
      >
        <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to collections
      </button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border/20 pb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 border rounded-2xl bg-primary/5 border-primary/20 text-3xl flex items-center justify-center select-none shrink-0">
            {collection.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {collection.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
              {collection.description}
            </p>
            <span className="text-[10px] font-mono text-muted-foreground mt-2 block font-semibold">
              {collection.memoryCount} saved memories
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="h-9 px-3 rounded-full text-xs font-semibold"
          >
            <HugeiconsIcon icon={Edit} strokeWidth={2.25} className="h-3.5 w-3.5" /> Edit
          </Button>
          <CollectionActionsMenu collection={collection} redirectTo="/app/collections" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative flex items-center max-w-xs w-full">
          <HugeiconsIcon icon={Search} strokeWidth={2.25} className="absolute left-3.5 h-4 w-4 text-primary stroke-[2.5] z-10" />
          <Input
            type="text"
            placeholder="Search this collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center border border-border/60 rounded-lg bg-card overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 hover:bg-muted transition-colors", viewMode === "grid" ? "text-primary bg-primary/5" : "text-muted-foreground")}
            >
              <HugeiconsIcon icon={Grid} strokeWidth={2.25} className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 hover:bg-muted transition-colors", viewMode === "list" ? "text-primary bg-primary/5" : "text-muted-foreground")}
            >
              <HugeiconsIcon icon={List} strokeWidth={2.25} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Memories Grid list */}
      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/45 bg-muted/75 p-1">
              <div className="p-4 rounded-lg border border-border/75 bg-card min-h-[165px] space-y-3">
                <Skeleton className="h-3.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-2.5 w-full" />
                <div className="flex items-center justify-between pt-2.5 border-t border-border/20">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-2.5 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20 max-w-sm mx-auto space-y-3">
          <h3 className="text-sm font-semibold text-foreground">No memories in this collection yet</h3>
          <p className="text-xs text-muted-foreground">Add memories to it from the memories list or quick capture.</p>
        </div>
      ) : (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "flex flex-col gap-3"
        )}>
          {memories.map((item) => (
            <Link
              key={item.id}
              href={`/app/memories/${item.id}`}
              className="rounded-xl border border-border/45 bg-muted/75 p-1 shadow-xs hover:border-primary/20 transition-all duration-300 block group"
            >
              <div className="p-4 rounded-lg border border-border/75 bg-card flex flex-col justify-between h-full min-h-[165px] space-y-4">
                <MemoryThumbnail item={item} className="rounded-lg" />
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded uppercase">
                    {item.type}
                  </span>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-border/20 text-[9px] text-muted-foreground font-mono">
                  <span className="truncate max-w-[120px]">{item.source}</span>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <EditCollectionDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />

      {/* Local animation keyframes */}
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
