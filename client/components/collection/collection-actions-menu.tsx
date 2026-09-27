"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon as MoreHorizontal,
  Share02Icon as Share2,
  LockPasswordIcon as Lock,
  Delete02Icon as Trash2,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { ShareDialog } from "@/components/share/share-dialog";
import { useDeleteCollectionMutation, useUpdateCollectionMutation } from "@/context/MemoryContext";
import type { Collection } from "@/types/memory";

interface CollectionActionsMenuProps {
  collection: Pick<Collection, "id" | "name" | "isVaulted">;
  trigger?: React.ReactElement;
  align?: "start" | "end";
  /** Where to navigate after vaulting/deleting succeeds. Omit to stay put — used on list surfaces where the card just disappears from the refetched query. */
  redirectTo?: string;
}

/** The full, consistent action set for a collection — Share, Add to vault,
 * Delete — used on both the collections list and the collection detail page. */
export function CollectionActionsMenu({ collection, trigger, align = "end", redirectTo }: CollectionActionsMenuProps) {
  const router = useRouter();
  const updateMutation = useUpdateCollectionMutation();
  const deleteMutation = useDeleteCollectionMutation();

  const [shareOpen, setShareOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            trigger ?? (
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={MoreHorizontal} strokeWidth={2.25} className="h-4 w-4" />
              </button>
            )
          }
        />
        <DropdownMenuContent align={align}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShareOpen(true);
            }}
          >
            <HugeiconsIcon icon={Share2} strokeWidth={2.25} className="h-3.5 w-3.5" /> Share
          </DropdownMenuItem>
          {/* Vaulting a collection hides every memory inside it too, and
              needs no unlock — hiding is always safe. Un-vaulting does
              require the PIN; the backend enforces that regardless of which
              page this menu renders from, so the vault page is just another
              caller of this same item. */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const next = !collection.isVaulted;
              updateMutation.mutate(
                { id: collection.id, patch: { isVaulted: next } },
                {
                  onSuccess: () => {
                    toast.add({ title: next ? "Moved to vault" : "Removed from vault", description: collection.name, type: "success" });
                    if (redirectTo) router.push(redirectTo);
                  },
                  onError: (err) =>
                    toast.add({
                      title: err instanceof Error ? err.message : next ? "Couldn't move this to the vault." : "Couldn't remove this from the vault.",
                      type: "error",
                    }),
                },
              );
            }}
          >
            <HugeiconsIcon icon={Lock} strokeWidth={2.25} className="h-3.5 w-3.5" /> {collection.isVaulted ? "Remove from vault" : "Add to vault"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDeleteConfirmOpen(true);
            }}
          >
            <HugeiconsIcon icon={Trash2} strokeWidth={2.25} className="h-3.5 w-3.5" /> Delete collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDialog resourceType="collection" resourceId={collection.id} resourceName={collection.name} open={shareOpen} onOpenChange={setShareOpen} />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="destructive">
              <HugeiconsIcon icon={Trash2} strokeWidth={2.25} />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>Memories inside won&apos;t be deleted, only unlinked from this collection.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await deleteMutation.mutateAsync(collection.id);
                  toast.add({ title: "Collection deleted", type: "success" });
                  if (redirectTo) router.push(redirectTo);
                } catch (err) {
                  toast.add({
                    title: "Couldn't delete this collection",
                    description: err instanceof Error ? err.message : undefined,
                    type: "error",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
