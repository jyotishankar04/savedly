"use client";

import {
  ArchiveIcon,
  ArrowTurnBackwardIcon,
  Delete02Icon,
  FolderAddIcon,
  FolderRemoveIcon,
  FolderTransferIcon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  StarIcon,
  StarOffIcon,
  Tag01Icon,
  TagsIcon,
} from "@hugeicons/core-free-icons";
import { SelectionBar, type SelectionAction } from "@/components/selection/selection-bar";
import { useCollectionPicker, useTagPicker } from "@/components/selection/pickers";
import {
  useBatchDeleteMutation,
  useBatchMoveToCollectionMutation,
  useBatchRestoreMutation,
  useBatchTagMutation,
  useBatchUncollectMutation,
  useBatchUpdateStatusMutation,
} from "@/hooks/use-batch";
import type { Selection } from "@/hooks/use-selection";
import type { BatchResult } from "@/lib/batch-api";
import type { Memory } from "@/types/memory";

/** Where the list is: decides which actions make sense. */
export type MemoryListContext = "library" | "archive" | "vault" | "trash" | "collection";

const n = (count: number) => `${count} ${count === 1 ? "memory" : "memories"}`;

/** Turns a BatchResult into the toast's text, or an error when nothing went through. */
function report(result: BatchResult, done: (count: number) => string): string {
  if (result.succeeded === 0) throw new Error("That didn't go through. Some of these may have changed; refresh and try again.");
  const message = done(result.succeeded);
  return result.failed > 0 ? `${message} ${result.failed} couldn't be changed.` : message;
}

/**
 * The bulk actions bar for a list of memories (Memories, Favorites, Recent,
 * Archive, Vault, Trash, a collection). The actions follow the page: Trash
 * offers Restore and Delete permanently; a collection adds Remove from it;
 * Archive and Vault offer the way back out.
 */
export function MemorySelectionBar({
  selection,
  memories,
  context,
  collection,
}: {
  selection: Selection;
  /** The memories on the page, to read the selected ones' tags and favourites. */
  memories: Memory[];
  context: MemoryListContext;
  collection?: { id: string; name: string };
}) {
  const move = useBatchMoveToCollectionMutation();
  const tag = useBatchTagMutation();
  const status = useBatchUpdateStatusMutation();
  const remove = useBatchDeleteMutation();
  const restore = useBatchRestoreMutation();
  const uncollect = useBatchUncollectMutation();
  const collectionPicker = useCollectionPicker();
  const tagPicker = useTagPicker();

  const ids = selection.ids;
  const selected = memories.filter((m) => selection.has(m.id));
  const allFavorite = selected.length > 0 && selected.every((m) => m.isFavorite);
  const selectedTags = [...new Set(selected.flatMap((m) => m.tags))].sort();

  const actions: SelectionAction[] =
    context === "trash"
      ? [
          {
            key: "restore",
            label: "Restore",
            icon: ArrowTurnBackwardIcon,
            run: async () => report(await restore.mutateAsync({ memoryIds: ids }), (c) => `${n(c)} restored.`),
          },
          {
            key: "delete",
            label: "Delete permanently",
            icon: Delete02Icon,
            destructive: true,
            confirm: {
              title: `Delete ${n(ids.length)} permanently?`,
              description: "They're removed for good, with their files and everything Savedly learned from them. This can't be undone.",
              confirmLabel: "Delete permanently",
            },
            run: async () => report(await remove.mutateAsync({ memoryIds: ids, permanent: true }), (c) => `${n(c)} deleted permanently.`),
          },
        ]
      : [
          {
            key: "add",
            label: "Add to collection",
            icon: FolderAddIcon,
            run: async () => {
              const target = await collectionPicker.pick(`Add ${n(ids.length)} to a collection`, "Add", collection?.id);
              return report(await move.mutateAsync({ memoryIds: ids, collectionId: target.id, mode: "add" }), (c) => `${n(c)} added to ${target.name}.`);
            },
          },
          {
            key: "move",
            label: "Move to collection",
            icon: FolderTransferIcon,
            run: async () => {
              const target = await collectionPicker.pick(`Move ${n(ids.length)} to a collection`, "Move here", collection?.id);
              return report(await move.mutateAsync({ memoryIds: ids, collectionId: target.id, mode: "move" }), (c) => `${n(c)} moved to ${target.name}.`);
            },
          },
          ...(context === "collection" && collection
            ? [
                {
                  key: "uncollect",
                  label: `Remove from ${collection.name}`,
                  icon: FolderRemoveIcon,
                  run: async () =>
                    report(await uncollect.mutateAsync({ memoryIds: ids, collectionId: collection.id }), (c) => `${n(c)} removed from ${collection.name}.`),
                },
              ]
            : []),
          {
            key: "tag",
            label: "Add tags",
            icon: Tag01Icon,
            run: async () => {
              const names = await tagPicker.pick(`Add tags to ${n(ids.length)}`, "Add tags");
              return report(await tag.mutateAsync({ memoryIds: ids, tagNames: names, mode: "add" }), (c) => `Tagged ${n(c)} with ${names.join(", ")}.`);
            },
          },
          ...(selectedTags.length > 0
            ? [
                {
                  key: "untag",
                  label: "Remove tags",
                  icon: TagsIcon,
                  run: async () => {
                    const names = await tagPicker.pick(`Remove tags from ${n(ids.length)}`, "Remove tags", selectedTags);
                    return report(await tag.mutateAsync({ memoryIds: ids, tagNames: names, mode: "remove" }), (c) => `Removed ${names.join(", ")} from ${n(c)}.`);
                  },
                },
              ]
            : []),
          {
            key: "favorite",
            label: allFavorite ? "Unfavorite" : "Favorite",
            icon: allFavorite ? StarOffIcon : StarIcon,
            run: async () =>
              report(await status.mutateAsync({ memoryIds: ids, favorite: !allFavorite }), (c) => `${n(c)} ${allFavorite ? "removed from" : "added to"} favorites.`),
          },
          {
            key: "archive",
            label: context === "archive" ? "Unarchive" : "Archive",
            icon: ArchiveIcon,
            run: async () =>
              report(await status.mutateAsync({ memoryIds: ids, archived: context !== "archive" }), (c) => `${n(c)} ${context === "archive" ? "moved out of the archive" : "archived"}.`),
          },
          {
            key: "vault",
            label: context === "vault" ? "Out of vault" : "Move to vault",
            icon: context === "vault" ? SquareUnlock01Icon : SquareLock01Icon,
            run: async () =>
              report(await status.mutateAsync({ memoryIds: ids, vaulted: context !== "vault" }), (c) => `${n(c)} ${context === "vault" ? "taken out of the vault" : "moved to the vault"}.`),
          },
          {
            key: "trash",
            label: "Move to Trash",
            icon: Delete02Icon,
            destructive: true,
            run: async () => report(await remove.mutateAsync({ memoryIds: ids, permanent: false }), (c) => `${n(c)} moved to Trash. You can restore them for 15 days.`),
          },
        ];

  return (
    <>
      <SelectionBar selection={selection} noun={["memory", "memories"]} actions={actions} />
      {collectionPicker.element}
      {tagPicker.element}
    </>
  );
}
