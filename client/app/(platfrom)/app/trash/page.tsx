"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon as Trash2, RotateCcwIcon as RotateCcw } from "@hugeicons/core-free-icons";
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
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import type { Memory } from "@/types/memory";

// Mirrors TRASH_RETENTION_DAYS in server/src/modules/memory/trash-purge.job.ts —
// display-only, so keep the two in sync if the retention window ever changes.
const TRASH_RETENTION_DAYS = 15;

/** Days left before the purge job hard-deletes this, or null if trashedAt is missing (shouldn't happen once a memory is actually trashed). */
function daysUntilPurge(trashedAt: string | null): number | null {
  if (!trashedAt) return null;
  const purgesAt = new Date(trashedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgesAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashPage() {
  const { data, isLoading, isError, refetch } = useMemoriesQuery({ inTrash: true, limit: 100 });
  const trashedItems = data?.items ?? [];

  const updateMutation = useUpdateMemoryMutation();
  const deleteMutation = useDeleteMemoryMutation();

  const handleRestore = (id: string, title: string) => {
    updateMutation.mutate(
      { id, patch: { inTrash: false } },
      {
        onSuccess: () => toast.add({ title: "Restored to active index", description: title, type: "success" }),
        onError: (err) => toast.add({ title: "Couldn't restore that memory", description: err instanceof Error ? err.message : undefined, type: "error" }),
      },
    );
  };

  const handleDeletePermanently = (id: string, title: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.add({ title: "Deleted permanently", description: title, type: "success" }),
      onError: (err) => toast.add({ title: "Couldn't delete that memory", description: err instanceof Error ? err.message : undefined, type: "error" }),
    });
  };

  const handleEmptyTrash = async () => {
    try {
      await Promise.all(trashedItems.map((item) => deleteMutation.mutateAsync(item.id)));
      toast.add({ title: "Trash emptied", type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't empty trash", description: err instanceof Error ? err.message : undefined, type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader
        title="Trash"
        description={`Deleted memories stay here for ${TRASH_RETENTION_DAYS} days before they're gone for good, unless you restore them first.`}
        action={
          trashedItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" className="h-10 rounded-full border-destructive/25 px-4 text-destructive hover:bg-destructive/10">Empty trash</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia tone="destructive">
                    <HugeiconsIcon icon={Trash2} strokeWidth={2} />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {trashedItems.length} item{trashedItems.length === 1 ? "" : "s"} in your trash. This action can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleEmptyTrash}>
                    Empty trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />

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
      ) : trashedItems.length === 0 ? (
        <EmptyState title="Trash is empty" description="Deleted memories show up here before they're gone for good." />
      ) : (
        <ul className="space-y-2">
          {trashedItems.map((item) => (
            <TrashRow key={item.id} item={item} onRestore={handleRestore} onDelete={handleDeletePermanently} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TrashRow({
  item,
  onRestore,
  onDelete,
}: {
  item: Memory;
  onRestore: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const daysLeft = daysUntilPurge(item.trashedAt);
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3">
      <div className="w-16 shrink-0 opacity-70">
        <MemoryThumbnail item={item} className="rounded-xl grayscale" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {daysLeft === null ? "Trashed" : daysLeft === 0 ? "Purges today" : `Purges in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
        </p>
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
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
