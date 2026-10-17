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
import { SelectionBar, type ActionOutcome, type SelectionAction } from "@/components/selection/selection-bar";
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

/** The ids an action changed: every one asked for, less those the server reports as failed. */
const changed = (result: BatchResult, ids: string[]) => {
  const failed = new Set((result.errors ?? []).map((e) => e.id));
  return ids.filter((id) => !failed.has(id));
};

/** The toast for a done action, with an undo when there is something to take back. */
function outcome(result: BatchResult, done: (count: number) => string, undo?: () => Promise<string>): ActionOutcome {
  return { message: report(result, done), undo };
}

const hasTag = (m: Memory, name: string) => m.tags.some((t) => t.toLowerCase() === name.toLowerCase());

/** Undoing out of the vault needs it unlocked, which moving in doesn't. */
const vaultLocked = (err: unknown) =>
  err instanceof Error && /vault is locked/i.test(err.message) ? new Error("Unlock your vault to take them back out.") : err;

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

  // Each run reads `selected` as it was before the action, which is what its undo puts back.
  const actions: SelectionAction[] =
    context === "trash"
      ? [
          {
            key: "restore",
            label: "Restore",
            icon: ArrowTurnBackwardIcon,
            run: async () => {
              const result = await restore.mutateAsync({ memoryIds: ids });
              const back = changed(result, ids);
              return outcome(result, (c) => `${n(c)} restored.`, async () => {
                await remove.mutateAsync({ memoryIds: back, permanent: false });
                return `${n(back.length)} back in Trash.`;
              });
            },
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
              const result = await move.mutateAsync({ memoryIds: ids, collectionId: target.id, mode: "add" });
              // Only the ones that weren't in it already come back out.
              const added = changed(result, ids).filter((id) => !selected.find((m) => m.id === id)?.collections.some((c) => c.id === target.id));
              return outcome(
                result,
                (c) => `${n(c)} added to ${target.name}.`,
                added.length
                  ? async () => {
                      await uncollect.mutateAsync({ memoryIds: added, collectionId: target.id });
                      return `Taken back out of ${target.name}.`;
                    }
                  : undefined,
              );
            },
          },
          {
            key: "move",
            label: "Move to collection",
            icon: FolderTransferIcon,
            inMenu: true,
            run: async () => {
              const target = await collectionPicker.pick(`Move ${n(ids.length)} to a collection`, "Move here", collection?.id);
              const result = await move.mutateAsync({ memoryIds: ids, collectionId: target.id, mode: "move" });
              const moved = new Set(changed(result, ids));
              const before = selected.filter((m) => moved.has(m.id));
              return outcome(result, (c) => `${n(c)} moved to ${target.name}.`, async () => {
                // Back into every collection each one was in, then out of the target for those that weren't in it.
                const into = new Map<string, string[]>();
                for (const m of before) for (const c of m.collections) if (c.id !== target.id) into.set(c.id, [...(into.get(c.id) ?? []), m.id]);
                await Promise.all([...into].map(([collectionId, memoryIds]) => move.mutateAsync({ memoryIds, collectionId, mode: "add" })));
                const newcomers = before.filter((m) => !m.collections.some((c) => c.id === target.id)).map((m) => m.id);
                if (newcomers.length) await uncollect.mutateAsync({ memoryIds: newcomers, collectionId: target.id });
                return `Moved back where ${before.length === 1 ? "it was" : "they were"}.`;
              });
            },
          },
          ...(context === "collection" && collection
            ? [
                {
                  key: "uncollect",
                  label: `Remove from ${collection.name}`,
                  icon: FolderRemoveIcon,
                  run: async () => {
                    const result = await uncollect.mutateAsync({ memoryIds: ids, collectionId: collection.id });
                    const removed = changed(result, ids);
                    return outcome(result, (c) => `${n(c)} removed from ${collection.name}.`, async () => {
                      await move.mutateAsync({ memoryIds: removed, collectionId: collection.id, mode: "add" });
                      return `Back in ${collection.name}.`;
                    });
                  },
                },
              ]
            : []),
          {
            key: "tag",
            label: "Add tags",
            icon: Tag01Icon,
            run: async () => {
              const names = await tagPicker.pick(`Add tags to ${n(ids.length)}`, "Add tags");
              const result = await tag.mutateAsync({ memoryIds: ids, tagNames: names, mode: "add" });
              const tagged = new Set(changed(result, ids));
              // Each tag comes off only the memories that didn't have it before.
              const newly = names.map((name) => ({ name, memoryIds: selected.filter((m) => tagged.has(m.id) && !hasTag(m, name)).map((m) => m.id) })).filter((g) => g.memoryIds.length);
              return outcome(
                result,
                (c) => `Tagged ${n(c)} with ${names.join(", ")}.`,
                newly.length
                  ? async () => {
                      await Promise.all(newly.map((g) => tag.mutateAsync({ memoryIds: g.memoryIds, tagNames: [g.name], mode: "remove" })));
                      return `Removed ${names.join(", ")} again.`;
                    }
                  : undefined,
              );
            },
          },
          ...(selectedTags.length > 0
            ? [
                {
                  key: "untag",
                  label: "Remove tags",
                  icon: TagsIcon,
                  inMenu: true,
                  run: async () => {
                    const names = await tagPicker.pick(`Remove tags from ${n(ids.length)}`, "Remove tags", selectedTags);
                    const result = await tag.mutateAsync({ memoryIds: ids, tagNames: names, mode: "remove" });
                    const untagged = new Set(changed(result, ids));
                    // Back on the memories that had each one, as it was spelled there.
                    const had = selected.filter((m) => untagged.has(m.id)).flatMap((m) => m.tags.filter((t) => names.some((x) => x.toLowerCase() === t.toLowerCase())).map((t) => ({ tag: t, id: m.id })));
                    const byTag = new Map<string, string[]>();
                    for (const { tag: t, id } of had) byTag.set(t, [...(byTag.get(t) ?? []), id]);
                    return outcome(result, (c) => `Removed ${names.join(", ")} from ${n(c)}.`, async () => {
                      await Promise.all([...byTag].map(([t, memoryIds]) => tag.mutateAsync({ memoryIds, tagNames: [t], mode: "add" })));
                      return `${names.join(", ")} put back.`;
                    });
                  },
                },
              ]
            : []),
          {
            key: "favorite",
            label: allFavorite ? "Unfavorite" : "Favorite",
            icon: allFavorite ? StarOffIcon : StarIcon,
            run: async () => {
              const favorite = !allFavorite;
              const result = await status.mutateAsync({ memoryIds: ids, favorite });
              const flipped = new Set(changed(result, ids));
              const toFlip = selected.filter((m) => flipped.has(m.id) && m.isFavorite !== favorite).map((m) => m.id);
              return outcome(
                result,
                (c) => `${n(c)} ${favorite ? "added to" : "removed from"} favorites.`,
                toFlip.length
                  ? async () => {
                      await status.mutateAsync({ memoryIds: toFlip, favorite: !favorite });
                      return favorite ? "Taken out of favorites again." : "Back in favorites.";
                    }
                  : undefined,
              );
            },
          },
          {
            key: "archive",
            label: context === "archive" ? "Unarchive" : "Archive",
            icon: ArchiveIcon,
            run: async () => {
              const archived = context !== "archive";
              const result = await status.mutateAsync({ memoryIds: ids, archived });
              const flipped = new Set(changed(result, ids));
              const toFlip = selected.filter((m) => flipped.has(m.id) && m.isArchived !== archived).map((m) => m.id);
              return outcome(
                result,
                (c) => `${n(c)} ${archived ? "archived" : "moved out of the archive"}.`,
                toFlip.length
                  ? async () => {
                      await status.mutateAsync({ memoryIds: toFlip, archived: !archived });
                      return archived ? "Back out of the archive." : "Back in the archive.";
                    }
                  : undefined,
              );
            },
          },
          {
            key: "vault",
            inMenu: context !== "vault",
            label: context === "vault" ? "Out of vault" : "Move to vault",
            icon: context === "vault" ? SquareUnlock01Icon : SquareLock01Icon,
            run: async () => {
              const vaulted = context !== "vault";
              const result = await status.mutateAsync({ memoryIds: ids, vaulted });
              const flipped = new Set(changed(result, ids));
              const toFlip = selected.filter((m) => flipped.has(m.id) && m.isVaulted !== vaulted).map((m) => m.id);
              return outcome(
                result,
                (c) => `${n(c)} ${vaulted ? "moved to the vault" : "taken out of the vault"}.`,
                toFlip.length
                  ? async () => {
                      await status.mutateAsync({ memoryIds: toFlip, vaulted: !vaulted }).catch((err) => {
                        throw vaultLocked(err);
                      });
                      return vaulted ? "Taken back out of the vault." : "Back in the vault.";
                    }
                  : undefined,
              );
            },
          },
          {
            key: "trash",
            label: "Move to Trash",
            icon: Delete02Icon,
            destructive: true,
            run: async () => {
              const result = await remove.mutateAsync({ memoryIds: ids, permanent: false });
              const trashed = changed(result, ids);
              return outcome(result, (c) => `${n(c)} moved to Trash.`, async () => {
                await restore.mutateAsync({ memoryIds: trashed });
                return `${n(trashed.length)} restored.`;
              });
            },
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
