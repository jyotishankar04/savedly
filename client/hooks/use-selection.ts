"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Multi-select for one list of items (memories or collections), for the bulk
 * actions bar (components/selection). Each page holds its own, so leaving a
 * page drops its selection.
 *
 * - toggle(id, event): Shift+click selects the range from the last item
 *   clicked to this one, in the order the page shows them.
 * - Ctrl/Cmd+A selects everything shown, but only once something is already
 *   selected, so it never takes over the browser's own select-all otherwise.
 * - Esc clears.
 *
 * Ids that leave the list (deleted, filtered away) drop out of the selection.
 */
export interface Selection {
  ids: string[];
  count: number;
  isSelecting: boolean;
  has: (id: string) => boolean;
  toggle: (id: string, event?: { shiftKey?: boolean }) => void;
  selectAll: () => void;
  /** Ends selecting: clears, and leaves the mode started by start(). */
  clear: () => void;
  /** Starts selecting with nothing picked yet (the header's Select button). */
  start: () => void;
  /** How many items the page shows, for "Select all". */
  total: number;
}

export function useSelection(visibleIds: string[]): Selection {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [started, setStarted] = useState(false);
  const anchor = useRef<string | null>(null);
  const visibleKey = visibleIds.join("|");

  // Only what's still on the page counts as selected.
  const ids = useMemo(() => visibleIds.filter((id) => picked.has(id)), [picked, visibleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    (id: string, event?: { shiftKey?: boolean }) => {
      // Read the anchor now: the updater below runs later, after it moves.
      const from = anchor.current ? visibleIds.indexOf(anchor.current) : -1;
      const to = visibleIds.indexOf(id);
      setPicked((prev) => {
        const next = new Set(prev);
        if (event?.shiftKey && from !== -1 && to !== -1) {
          const [start, end] = from < to ? [from, to] : [to, from];
          for (const rangeId of visibleIds.slice(start, end + 1)) next.add(rangeId);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      anchor.current = id;
    },
    [visibleKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectAll = useCallback(() => setPicked(new Set(visibleIds)), [visibleKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = useCallback(() => {
    setPicked(new Set());
    setStarted(false);
    anchor.current = null;
  }, []);
  const start = useCallback(() => setStarted(true), []);

  const isSelecting = ids.length > 0 || started;

  useEffect(() => {
    if (!isSelecting) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || target?.closest("input, textarea, [contenteditable=true], [role=dialog], [role=alertdialog], [role=menu]")) return;
      if (event.key === "Escape") {
        clear();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSelecting, clear, selectAll]);

  const pickedIds = useMemo(() => new Set(ids), [ids]);
  return { ids, count: ids.length, isSelecting, has: (id) => pickedIds.has(id), toggle, selectAll, clear, start, total: visibleIds.length };
}
