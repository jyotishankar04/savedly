"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";

export default function FavoritesPage() {
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ isFavorite: true, limit: 100 });
  const favorites = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Favorites" description="Memories you've starred, all in one place." />

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
      ) : favorites.length === 0 ? (
        <EmptyState title="No favorites yet" description="Star a memory from its card or detail page to pin it here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => (
            <MemoryGridCard key={item.id} item={item} href={`/app/memories/${item.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
