"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as Search, Tag01Icon as TagIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useTagsQuery } from "@/context/MemoryContext";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";

export default function TagsPage() {
  const { data: tags = [], isLoading, isError, refetch } = useTagsQuery();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTags = searchQuery.trim()
    ? tags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : tags;
  const sorted = [...filteredTags].sort((a, b) => b.memoryCount - a.memoryCount);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Tags" description="Every tag you've used — pick one to see everything saved under it." />

      {tags.length > 0 && (
        <div className="relative max-w-sm">
          <HugeiconsIcon icon={Search} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search tags"
            placeholder="Search tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      )}

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
        </div>
      ) : tags.length === 0 ? (
        <EmptyState title="No tags yet" description="Add tags to a memory from its detail page or the capture form, and they'll show up here." />
      ) : sorted.length === 0 ? (
        <EmptyState title={`No tags match "${searchQuery.trim()}"`} description="Try a different search." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {sorted.map((tag) => (
            <Link
              key={tag.id}
              href={`/app/tags/${encodeURIComponent(tag.name)}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-foreground/85 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <HugeiconsIcon icon={TagIcon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
              {tag.name}
              <span className="text-xs text-muted-foreground">{tag.memoryCount}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
