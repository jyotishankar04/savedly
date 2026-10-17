"use client";

import type React from "react";
import type { QueryClient } from "@tanstack/react-query";
import { selectionContaining } from "@/hooks/use-selection";
import type { Memory } from "@/types/memory";

/**
 * Dragging memories onto a collection. A card or row being dragged carries
 * its id, or every selected id when it is part of the selection; the drop
 * target (a collection in the sidebar) reads them back. Desktop only: on a
 * touch screen a long press selects instead (see selectableProps).
 */
export const MEMORY_DRAG_TYPE = "application/x-savedly-memories";

let dragging: string[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** For useSyncExternalStore: the ids being dragged right now, or null. */
export const memoryDrag = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => dragging,
  getServer: () => null,
};

export const isMemoryDrag = (event: React.DragEvent) => event.dataTransfer.types.includes(MEMORY_DRAG_TYPE);

export function draggedIds(event: React.DragEvent): string[] {
  try {
    const ids: unknown = JSON.parse(event.dataTransfer.getData(MEMORY_DRAG_TYPE) || "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** The pill that follows the pointer: the memory's title, or how many. */
function setDragImage(event: React.DragEvent, text: string) {
  const pill = document.createElement("div");
  pill.textContent = text;
  Object.assign(pill.style, {
    position: "fixed",
    top: "-1000px",
    left: "-1000px",
    maxWidth: "240px",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "var(--primary)",
    color: "var(--primary-foreground)",
    font: "500 13px/1.3 var(--font-sans, system-ui, sans-serif)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.25)",
  });
  document.body.appendChild(pill);
  event.dataTransfer.setDragImage(pill, 16, 16);
  // The browser has taken its snapshot by the next task.
  setTimeout(() => pill.remove(), 0);
}

/** Props that make a memory's card or row draggable. */
export function memoryDragProps({ id, title, selected }: { id: string; title: string; selected: boolean }) {
  return {
    // Also how the list keys (components/memory/list-keys.ts) find memories on the page.
    "data-memory-row": id,
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      const ids = (selected && selectionContaining(id)) || [id];
      event.dataTransfer.setData(MEMORY_DRAG_TYPE, JSON.stringify(ids));
      event.dataTransfer.effectAllowed = "copy";
      setDragImage(event, ids.length === 1 ? title || "1 memory" : `${ids.length} memories`);
      dragging = ids;
      emit();
    },
    onDragEnd: () => {
      dragging = null;
      emit();
    },
  };
}

/** The dragged memories as the lists on screen have them, from the query cache. */
export function cachedMemories(queryClient: QueryClient, ids: string[]): Map<string, Memory> {
  const wanted = new Set(ids);
  const found = new Map<string, Memory>();
  for (const [, data] of queryClient.getQueriesData<{ items?: Memory[] }>({ queryKey: ["memories"] })) {
    for (const memory of data?.items ?? []) if (wanted.has(memory.id) && !found.has(memory.id)) found.set(memory.id, memory);
  }
  return found;
}
