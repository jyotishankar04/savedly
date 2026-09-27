"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon as MoreHorizontal,
  Share02Icon as Share2,
  FolderOpenIcon as FolderOpen,
  StarIcon as Star,
  Archive01Icon as Archive,
  LockPasswordIcon as Lock,
  Delete02Icon as Trash2,
  Calendar03Icon as CalendarIcon,
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
import { MoveToCollectionDialog } from "@/components/memory/move-to-collection-dialog";
import { AddToCalendarDialog } from "@/components/memory/add-to-calendar-dialog";
import { useMoveToTrashMutation, useToggleFavoriteMutation, useUpdateMemoryMutation } from "@/context/MemoryContext";
import type { Memory } from "@/types/memory";

interface MemoryActionsMenuProps {
  memory: Pick<Memory, "id" | "title" | "isFavorite" | "isArchived" | "isVaulted" | "collections" | "description" | "url" | "eventAt">;
  trigger?: React.ReactElement;
  align?: "start" | "end";
  /** Where to navigate after archive/vault/trash succeeds. Omit to stay put — used on list surfaces where the item just drops out of the refetched query. */
  redirectTo?: string;
}

/** The full, consistent action set for a memory — Share, Move to collection,
 * Favorite, Archive, Move to vault, Move to trash — used on every surface
 * that lists or opens a memory, so the options don't drift between pages. */
export function MemoryActionsMenu({ memory, trigger, align = "end", redirectTo }: MemoryActionsMenuProps) {
  const router = useRouter();
  const toggleFavorite = useToggleFavoriteMutation();
  const updateMutation = useUpdateMemoryMutation();
  const moveToTrash = useMoveToTrashMutation();

  const [shareOpen, setShareOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [trashConfirmOpen, setTrashConfirmOpen] = React.useState(false);

  function afterMutate() {
    if (redirectTo) router.push(redirectTo);
  }

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
              setShareOpen(true);
            }}
          >
            <HugeiconsIcon icon={Share2} strokeWidth={2.25} className="h-3.5 w-3.5" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setMoveOpen(true);
            }}
          >
            <HugeiconsIcon icon={FolderOpen} strokeWidth={2.25} className="h-3.5 w-3.5" /> Move to collection
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setCalendarOpen(true);
            }}
          >
            <HugeiconsIcon icon={CalendarIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
            {memory.eventAt ? "Calendar event" : "Add to calendar"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite.mutate(
                { id: memory.id, isFavorite: !memory.isFavorite },
                {
                  onError: (err) =>
                    toast.add({ title: "Couldn't update favorite", description: err instanceof Error ? err.message : undefined, type: "error" }),
                },
              );
            }}
          >
            <HugeiconsIcon icon={Star} strokeWidth={2.25} className="h-3.5 w-3.5" />
            {memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              const next = !memory.isArchived;
              updateMutation.mutate(
                { id: memory.id, patch: { isArchived: next } },
                {
                  onSuccess: () => {
                    toast.add({ title: next ? "Moved to archive" : "Restored from archive", description: memory.title, type: "success" });
                    afterMutate();
                  },
                  onError: (err) =>
                    toast.add({ title: "Couldn't update this memory", description: err instanceof Error ? err.message : undefined, type: "error" }),
                },
              );
            }}
          >
            <HugeiconsIcon icon={Archive} strokeWidth={2.25} className="h-3.5 w-3.5" />
            {memory.isArchived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          {/* Vaulting needs no unlock — hiding something is always safe.
              Un-vaulting does require the PIN; the backend enforces that
              regardless of which page this menu is rendered from, so the
              vault page itself is just another caller of this same item. */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              const next = !memory.isVaulted;
              updateMutation.mutate(
                { id: memory.id, patch: { isVaulted: next } },
                {
                  onSuccess: () => {
                    toast.add({ title: next ? "Moved to vault" : "Removed from vault", description: memory.title, type: "success" });
                    afterMutate();
                  },
                  onError: (err) =>
                    toast.add({
                      title: next ? "Couldn't move this to the vault" : "Couldn't remove this from the vault",
                      description: err instanceof Error ? err.message : undefined,
                      type: "error",
                    }),
                },
              );
            }}
          >
            <HugeiconsIcon icon={Lock} strokeWidth={2.25} className="h-3.5 w-3.5" /> {memory.isVaulted ? "Remove from vault" : "Move to vault"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setTrashConfirmOpen(true);
            }}
          >
            <HugeiconsIcon icon={Trash2} strokeWidth={2.25} className="h-3.5 w-3.5" /> Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDialog resourceType="memory" resourceId={memory.id} resourceName={memory.title} open={shareOpen} onOpenChange={setShareOpen} />

      <MoveToCollectionDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        memoryId={memory.id}
        memoryTitle={memory.title}
        currentCollectionIds={memory.collections.map((c) => c.id)}
      />

      <AddToCalendarDialog memory={memory} open={calendarOpen} onOpenChange={setCalendarOpen} />

      <AlertDialog open={trashConfirmOpen} onOpenChange={setTrashConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="destructive">
              <HugeiconsIcon icon={Trash2} strokeWidth={2.25} />
            </AlertDialogMedia>
            <AlertDialogTitle>Move &quot;{memory.title}&quot; to trash?</AlertDialogTitle>
            <AlertDialogDescription>You can restore it from Trash within 15 days.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                moveToTrash.mutate(memory.id, {
                  onSuccess: () => {
                    toast.add({ title: "Moved to trash", description: memory.title, type: "success" });
                    afterMutate();
                  },
                  onError: (err) =>
                    toast.add({ title: "Couldn't move that memory to trash", description: err instanceof Error ? err.message : undefined, type: "error" }),
                });
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
