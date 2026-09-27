"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RotateCcwIcon as RotateCcw, Delete02Icon as Trash2 } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteMemoryMutation, useMemoriesQuery, useUpdateMemoryMutation } from "@/context/MemoryContext";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";
import { timeAgo } from "@/lib/time";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import type { Memory } from "@/types/memory";

export default function ArchivePage() {
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ isArchived: true, limit: 100 });
  const archives = data?.items ?? [];

  const updateMutation = useUpdateMemoryMutation();
  const deleteMutation = useDeleteMemoryMutation();

  const handleRestore = (id: string, title: string) => {
    updateMutation.mutate(
      { id, patch: { isArchived: false } },
      {
        onSuccess: () => toast.add({ title: "Restored to active index", description: title, type: "success" }),
        onError: (err) => toast.add({ title: "Couldn't restore that memory", description: err instanceof Error ? err.message : undefined, type: "error" }),
      },
    );
  };

  const handleDelete = (id: string, title: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.add({ title: "Deleted permanently", description: title, type: "success" }),
      onError: (err) => toast.add({ title: "Couldn't delete that memory", description: err instanceof Error ? err.message : undefined, type: "error" }),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Archive" description="Archived memories are hidden from Home and search until you restore them." />

      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : archives.length === 0 ? (
        <EmptyState title="Nothing archived" description="Archive a memory from its detail page to keep it out of your active views without deleting it." />
      ) : (
        <ul className="space-y-2">
          {archives.map((item) => (
            <ArchiveRow key={item.id} item={item} onRestore={handleRestore} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArchiveRow({
  item,
  onRestore,
  onDelete,
}: {
  item: Memory;
  onRestore: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3">
      <div className="w-16 shrink-0">
        <MemoryThumbnail item={item} className="rounded-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onRestore(item.id, item.title)} className="h-9 rounded-full px-3.5 text-sm">
          <HugeiconsIcon icon={RotateCcw} strokeWidth={2} className="h-4 w-4" /> Restore
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Delete permanently"
                className="h-9 w-9 rounded-full border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
              >
                <HugeiconsIcon icon={Trash2} strokeWidth={2} className="h-4 w-4" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia tone="destructive">
                <HugeiconsIcon icon={Trash2} strokeWidth={2} />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete &ldquo;{item.title}&rdquo; permanently?</AlertDialogTitle>
              <AlertDialogDescription>This action can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(item.id, item.title)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
