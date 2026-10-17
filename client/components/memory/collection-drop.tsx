"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { announceOutcome } from "@/components/selection/selection-bar";
import { toast } from "@/components/ui/toast";
import { openUpgradeDialog } from "@/components/upgrade-dialog";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import { useBatchMoveToCollectionMutation, useBatchUncollectMutation } from "@/hooks/use-batch";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { clearSelections } from "@/hooks/use-selection";
import { getMemory } from "@/lib/memories";
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

/** Props for a collection that memories can be dropped on, and whether some are over it now. */
export function useCollectionDrop(target: Target) {
  const file = useFileIntoCollection();
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
      if (ids.length) void file(ids, target);
    },
  };
  return { over, props };
}
