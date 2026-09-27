"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, Tag01Icon as TagIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { QueryErrorState } from "@/components/query-error-state";
import { EmptyState } from "@/components/app-page";

export default function TagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const { data, isLoading, isError, refetch } = useMemoriesQuery({ tag: name, limit: 100 });
  const memories = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <button
        onClick={() => router.push("/app/tags")}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft} strokeWidth={2} className="h-4 w-4" /> Back to tags
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
          <HugeiconsIcon icon={TagIcon} strokeWidth={2} className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{name}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {isLoading ? <Skeleton className="inline-block h-4 w-28 align-middle" /> : `${memories.length} saved ${memories.length === 1 ? "memory" : "memories"}`}
          </p>
        </div>
      </div>

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : memories.length === 0 ? (
        <EmptyState title={`Nothing tagged "${name}" yet`} description="Tag a memory with it from its detail page or the capture form." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((item) => (
            <MemoryGridCard key={item.id} item={item} href={`/app/memories/${item.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
