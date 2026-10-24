"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/memory";

const CAPTURE_COLLECTIONS_SHOWN = 8;

/**
 * Collections to file a save under, as chips to switch on and off. Laid out
 * in the form itself, not in a popover: it then works the same in the desktop
 * dialog and in the phone's bottom sheet, and what is chosen is always in view.
 */
export function CaptureCollectionPicker({
  collections,
  selectedIds,
  onChange,
  hideLegend = false,
}: {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Where something on screen already says "collections" (the Note tab's line that opens it), the heading is for screen readers only. */
  hideLegend?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  // Chosen ones first, so they stay in view when the list is cut short.
  const sorted = [...collections].sort((a, b) => Number(selectedIds.includes(b.id)) - Number(selectedIds.includes(a.id)) || a.name.localeCompare(b.name));
  const shown = showAll ? sorted : sorted.slice(0, Math.max(CAPTURE_COLLECTIONS_SHOWN, selectedIds.length));
  const hidden = sorted.length - shown.length;

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <fieldset className="space-y-2">
      <legend className={hideLegend ? "sr-only" : "text-sm font-medium text-foreground"}>Collections</legend>

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have none yet. Savedly suggests one after you save.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((col) => {
            const on = selectedIds.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(col.id)}
                title={col.name}
                className={cn(
                  "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-150",
                  on ? "border-primary/40 bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                <span aria-hidden>{col.icon}</span>
                <span className="truncate">{col.name}</span>
                {on && <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
          {hidden > 0 && (
            <button type="button" onClick={() => setShowAll(true)} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
              Show {hidden} more
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
