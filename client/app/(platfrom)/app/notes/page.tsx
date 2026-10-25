"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon as Plus } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";
import { MemorySelectionBar } from "@/components/selection/memory-selection-bar";
import { SelectButton } from "@/components/selection/selection-bar";
import { MemorySwipe } from "@/components/memory/memory-swipe";
import { useSelection } from "@/hooks/use-selection";

/** Everything you've written: notes are memories, so search, Ask and collections cover them too. A note opens in the editor. */
export default function NotesPage() {
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ type: "note", limit: 100 });
  const notes = data?.items ?? [];
  const selection = useSelection(notes.map((m) => m.id));

  const newNote = (
    <Button size="sm" className="h-9 rounded-full px-4 text-xs font-bold" nativeButton={false} render={<Link href="/app/notes/new" />}>
      <HugeiconsIcon icon={Plus} strokeWidth={2.5} className="size-4" />
      New note
    </Button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader
        title="Notes"
        description="What you've written. Type / in a note for headings, lists, to-dos and more."
        action={
          <div className="flex items-center gap-2">
            {notes.length > 0 && <SelectButton selection={selection} />}
            {newNote}
          </div>
        }
      />

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Write one here, or from Add to Savedly's Note tab." action={newNote} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((item) => (
            <MemorySwipe key={item.id} memory={item} disabled={selection.isSelecting} className="rounded-2xl">
              <MemoryGridCard
                item={item}
                href={`/app/notes/${item.id}`}
                selected={selection.has(item.id)}
                selecting={selection.isSelecting}
                onSelect={(e) => selection.toggle(item.id, e)}
              />
            </MemorySwipe>
          ))}
        </div>
      )}

      <MemorySelectionBar selection={selection} memories={notes} context="library" />
    </div>
  );
}
