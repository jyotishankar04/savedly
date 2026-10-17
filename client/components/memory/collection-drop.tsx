"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { announceOutcome } from "@/components/selection/selection-bar";
import { toast } from "@/components/ui/toast";
import { openUpgradeDialog } from "@/components/upgrade-dialog";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import {
  useBatchDeleteMutation,
  useBatchMoveToCollectionMutation,
  useBatchRestoreMutation,
  useBatchUncollectMutation,
  useBatchUpdateStatusMutation,
} from "@/hooks/use-batch";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { clearSelections } from "@/hooks/use-selection";
import { getMemory, type UpdateMemoryInput } from "@/lib/memories";
import type { Memory } from "@/types/memory";
import { cachedMemories, draggedIds, isMemoryDrag, memoryDrag } from "@/lib/memory-drag";

type Target = { id: string; name: string };

const n = (count: number) => `${count} ${count === 1 ? "memory" : "memories"}`;

/** True while memories are being dragged anywhere on the page. */
export function useMemoryDragging() {
  return useSyncExternalStore(memoryDrag.subscribe, memoryDrag.get, memoryDrag.getServer) !== null;
}

/**
 * Files dropped memories into a collection, with Undo. One memory works on
 * every plan; several at once is bulk organizing, a Lite+ feature, so on Free
 * it opens the plan picker. Memories already in the collection are skipped,
 * and Undo takes out only the ones this added.
 */
function useFileIntoCollection() {
  const queryClient = useQueryClient();
  const update = useUpdateMemoryMutation();
  const move = useBatchMoveToCollectionMutation();
  const uncollect = useBatchUncollectMutation();
  const bulk = usePlanFeature("batchOperations");

  return async (ids: string[], target: Target) => {
    const known = cachedMemories(queryClient, ids);
    const newcomers = ids.filter((id) => !known.get(id)?.collections.some((c) => c.id === target.id));
    if (newcomers.length === 0) {
      toast.add({ title: ids.length === 1 ? `Already in ${target.name}.` : `All ${ids.length} are already in ${target.name}.`, type: "info" });
      return;
    }
    if (newcomers.length > 1 && !bulk.allowed) {
      openUpgradeDialog();
      return;
    }
    clearSelections();
    const skipped = ids.length - newcomers.length;
    const title = ids.length === 1 ? known.get(ids[0]!)?.title : undefined;
    const done = (count: number) => `${count === 1 && title ? `“${title}”` : n(count)} added to ${target.name}.${skipped ? ` ${skipped} ${skipped === 1 ? "was" : "were"} already there.` : ""}`;

    try {
      if (bulk.allowed) {
        const result = await move.mutateAsync({ memoryIds: newcomers, collectionId: target.id, mode: "add" });
        if (result.succeeded === 0) throw new Error("That didn't go through. Refresh and try again.");
        const failed = new Set((result.errors ?? []).map((e) => e.id));
        const added = newcomers.filter((id) => !failed.has(id));
        announceOutcome({
          message: done(added.length),
          undo: async () => {
            await uncollect.mutateAsync({ memoryIds: added, collectionId: target.id });
            return `Taken back out of ${target.name}.`;
          },
        });
      } else {
        // One memory on Free: set its collections directly, from the server's own copy, since this replaces the whole list.
        const id = newcomers[0]!;
        const before = (await getMemory(id)).collections.map((c) => c.id);
        await update.mutateAsync({ id, patch: { collectionIds: [...before, target.id] } });
        announceOutcome({
          message: done(1),
          undo: async () => {
            await update.mutateAsync({ id, patch: { collectionIds: before } });
            return `Taken back out of ${target.name}.`;
          },
        });
      }
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : `Couldn't add to ${target.name}.`, type: "error" });
    }
  };
}

/** Props for anything memories can be dropped on, and whether some are over it now. */
function useMemoryDrop(onDrop: (ids: string[]) => void) {
  const [over, setOver] = useState(false);
  // Enter and leave fire for every child the pointer crosses; count them so the highlight doesn't flicker.
  const depth = useRef(0);

  const props = {
    onDragEnter: (event: React.DragEvent) => {
      if (!isMemoryDrag(event)) return;
      event.preventDefault();
      depth.current += 1;
      setOver(true);
    },
    onDragOver: (event: React.DragEvent) => {
      if (!isMemoryDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!isMemoryDrag(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (event: React.DragEvent) => {
      if (!isMemoryDrag(event)) return;
      event.preventDefault();
      depth.current = 0;
      setOver(false);
      const ids = draggedIds(event);
      if (ids.length) onDrop(ids);
    },
  };
  return { over, props };
}

/** Props for a collection that memories can be dropped on, and whether some are over it now. */
export function useCollectionDrop(target: Target) {
  const file = useFileIntoCollection();
  return useMemoryDrop((ids) => void file(ids, target));
}

/** The sidebar's places that are a state rather than a collection. */
export type Shelf = "favorite" | "archive" | "vault" | "trash";

const SHELVES: Record<
  Shelf,
  {
    has: (m: Memory) => boolean;
    done: (what: string) => string;
    already: string;
    undone: string;
    /** The same for taking them off the shelf (unfavorite, unarchive…). */
    off: { done: (what: string) => string; already: string; undone: string };
    patch: (on: boolean) => UpdateMemoryInput;
  }
> = {
  favorite: {
    has: (m) => m.isFavorite,
    done: (w) => `${w} added to favorites.`,
    already: "in your favorites",
    undone: "Taken out of favorites again.",
    off: { done: (w) => `${w} removed from favorites.`, already: "not a favorite", undone: "Back in favorites." },
    patch: (on) => ({ isFavorite: on }),
  },
  archive: {
    has: (m) => m.isArchived,
    done: (w) => `${w} archived.`,
    already: "archived",
    undone: "Back out of the archive.",
    off: { done: (w) => `${w} moved out of the archive.`, already: "out of the archive", undone: "Back in the archive." },
    patch: (on) => ({ isArchived: on }),
  },
  vault: {
    has: (m) => m.isVaulted,
    done: (w) => `${w} moved to the vault.`,
    already: "in the vault",
    undone: "Taken back out of the vault.",
    off: { done: (w) => `${w} taken out of the vault.`, already: "out of the vault", undone: "Back in the vault." },
    patch: (on) => ({ isVaulted: on }),
  },
  trash: {
    has: (m) => m.inTrash,
    done: (w) => `${w} moved to Trash.`,
    already: "in Trash",
    undone: "Restored.",
    off: { done: (w) => `${w} restored.`, already: "out of Trash", undone: "Back in Trash." },
    patch: (on) => ({ inTrash: on }),
  },
};

/** Undoing out of the vault needs it unlocked, which moving in doesn't. */
const friendlier = (err: unknown) =>
  err instanceof Error && /vault is locked/i.test(err.message) ? new Error("Unlock your vault to take them back out.") : err;

/**
 * Favorite, archive, vault or trash memories (or, with `on` false, the
 * reverse), with Undo; the same plan rules as filing into a collection. Used
 * by the sidebar's drop targets and the list keys.
 */
export function useShelve() {
  const queryClient = useQueryClient();
  const update = useUpdateMemoryMutation();
  const status = useBatchUpdateStatusMutation();
  const remove = useBatchDeleteMutation();
  const restore = useBatchRestoreMutation();
  const bulk = usePlanFeature("batchOperations");
  const vault = usePlanFeature("vault");

  return async (ids: string[], shelf: Shelf, on = true) => {
    const rules = SHELVES[shelf];
    const words = on ? rules : { ...rules, ...rules.off };
    const known = cachedMemories(queryClient, ids);
    // Only the ones this changes; one the cache doesn't know is assumed to need it.
    const todo = ids.filter((id) => {
      const m = known.get(id);
      return !m || rules.has(m) !== on;
    });
    if (todo.length === 0) {
      toast.add({ title: `${ids.length === 1 ? "Already" : `All ${ids.length} are already`} ${words.already}.`, type: "info" });
      return;
    }
    if ((shelf === "vault" && on && !vault.allowed) || (todo.length > 1 && !bulk.allowed)) {
      openUpgradeDialog();
      return;
    }
    clearSelections();
    const title = todo.length === 1 ? known.get(todo[0]!)?.title : undefined;
    const what = (count: number) => (count === 1 && title ? `“${title}”` : n(count));

    // Several go through the bulk endpoints; one through the memory itself, which works on every plan.
    const apply = async (memoryIds: string[], on: boolean) => {
      if (memoryIds.length === 1 && !bulk.allowed) {
        await update.mutateAsync({ id: memoryIds[0]!, patch: rules.patch(on) });
        return memoryIds;
      }
      const result =
        shelf === "trash"
          ? on
            ? await remove.mutateAsync({ memoryIds, permanent: false })
            : await restore.mutateAsync({ memoryIds })
          : await status.mutateAsync({ memoryIds, [shelf === "favorite" ? "favorite" : shelf === "archive" ? "archived" : "vaulted"]: on });
      if (result.succeeded === 0) throw new Error("That didn't go through. Refresh and try again.");
      const failed = new Set((result.errors ?? []).map((e) => e.id));
      return memoryIds.filter((id) => !failed.has(id));
    };

    try {
      const changed = await apply(todo, on);
      announceOutcome({
        message: words.done(what(changed.length)),
        undo: async () => {
          await apply(changed, !on).catch((err) => {
            throw friendlier(err);
          });
          return words.undone;
        },
      });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "That didn't work. Try again.", type: "error" });
    }
  };
}

/** Props for Favorites, Archive, Vault or Trash in the sidebar as a place to drop memories. */
export function useShelfDrop(shelf: Shelf) {
  const shelve = useShelve();
  return useMemoryDrop((ids) => void shelve(ids, shelf));
}
