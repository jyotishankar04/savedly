"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { isEditableTarget } from "@/components/capture/quick-save";
import { useShelve } from "@/components/memory/collection-drop";
import { activeSelection } from "@/hooks/use-selection";
import { cachedMemories } from "@/lib/memory-drag";

const rows = () => Array.from(document.querySelectorAll<HTMLElement>("[data-memory-row]"));
const focusedRow = () => (document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-memory-row]") : null);

function focusRow(row: HTMLElement) {
  // List rows that aren't links or buttons still need to take focus.
  if (row.tabIndex < 0 && !row.hasAttribute("tabindex")) row.setAttribute("tabindex", "-1");
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * Lists of memories, by keyboard, on every page that shows them (any card or
 * row marked with data-memory-row): J/K or the arrow keys move between them,
 * Enter opens, X selects, F favourites (or unfavourites), E archives (or, on
 * the Archive page, takes out), and # or Delete moves to Trash. The actions
 * apply to the selection when there is one, else to the memory in focus, and
 * each one's toast has Undo. Nothing happens while typing or with a dialog
 * open. The arrow keys only take over once a memory has focus, so they still
 * scroll the page otherwise.
 */
export function useMemoryListKeys() {
  const pathname = usePathname();
  const shelve = useShelve();
  const queryClient = useQueryClient();
  const latest = useRef({ shelve, pathname, queryClient });
  useEffect(() => {
    latest.current = { shelve, pathname, queryClient };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target) || document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      const list = rows();
      if (list.length === 0) return;
      const current = focusedRow();
      const index = current ? list.indexOf(current) : -1;
      const key = e.key;

      const move = (step: number) => {
        e.preventDefault();
        const next = index === -1 ? (step > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, index + step));
        focusRow(list[next]!);
      };

      if (key === "j" || key === "J") return move(1);
      if (key === "k" || key === "K") return move(-1);
      if (current && (key === "ArrowDown" || key === "ArrowRight")) return move(1);
      if (current && (key === "ArrowUp" || key === "ArrowLeft")) return move(-1);
      if (!current) return;

      const id = current.dataset.memoryRow!;
      if (key === "Enter") {
        // A card that is a link or a button opens itself; a plain row opens through the link inside it.
        if (current.matches('a[href], button, [role="button"]')) return;
        const link = current.querySelector<HTMLElement>("a[href]");
        if (link) {
          e.preventDefault();
          link.click();
        }
        return;
      }
      if (key === "x" || key === "X") {
        e.preventDefault();
        current.querySelector<HTMLElement>('[role="checkbox"]')?.click();
        return;
      }

      const ids = activeSelection() ?? [id];
      const { shelve: run, pathname: path, queryClient: cache } = latest.current;
      // After the focused memory leaves the list (archived, trashed), focus the one that takes its place.
      const refocus = () =>
        setTimeout(() => {
          const after = rows();
          if (!after.length || document.activeElement?.closest("[data-memory-row]")) return;
          focusRow(after[Math.min(index, after.length - 1)]!);
        }, 900);

      if (key === "f" || key === "F") {
        e.preventDefault();
        // Favourite unless every one already is, the way the selection bar's button works.
        const known = cachedMemories(cache, ids);
        const allFavorite = ids.every((x) => known.get(x)?.isFavorite);
        void run(ids, "favorite", !allFavorite);
      } else if (key === "e" || key === "E") {
        e.preventDefault();
        void run(ids, "archive", !path.startsWith("/app/archive")).then(refocus);
      } else if (key === "#" || key === "Delete") {
        e.preventDefault();
        void run(ids, "trash").then(refocus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
