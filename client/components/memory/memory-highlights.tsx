"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon as Trash, HighlighterIcon } from "@hugeicons/core-free-icons";
import { toast } from "@/components/ui/toast";
import { deleteHighlight, type MemoryHighlight } from "@/lib/memories";
import { memoryQueryKey } from "@/context/MemoryContext";

/** The same five colours the extension's highlighter uses. */
const COLORS: Record<string, string> = {
  yellow: "#facc15",
  green: "#4ade80",
  blue: "#60a5fa",
  pink: "#f472b6",
  purple: "#a78bfa",
};

/**
 * Passages highlighted on the page with the browser extension, with their
 * notes. Removing one here removes it from the page too.
 */
export function MemoryHighlights({ memoryId, highlights }: { memoryId: string; highlights: MemoryHighlight[] }) {
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<string | null>(null);
  if (highlights.length === 0) return null;

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await deleteHighlight(id);
      await queryClient.invalidateQueries({ queryKey: memoryQueryKey(memoryId) });
      toast.add({ title: "Highlight removed", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't remove it.", type: "error" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="memory-highlights">
      <h2 id="memory-highlights" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <HugeiconsIcon icon={HighlighterIcon} strokeWidth={2} className="h-4 w-4" />
        Highlights
        <span className="tabular-nums">({highlights.length})</span>
      </h2>
      <ul className="space-y-2">
        {highlights.map((h) => (
          <li key={h.id} className="group flex gap-3 rounded-xl border border-border/60 bg-card p-3">
            <span aria-hidden className="w-1 shrink-0 rounded-full" style={{ backgroundColor: COLORS[h.color] ?? COLORS.yellow }} />
            <div className="min-w-0 flex-1 space-y-1">
              <blockquote className="text-sm leading-relaxed text-foreground">“{h.text}”</blockquote>
              {h.note && <p className="text-xs leading-relaxed text-muted-foreground">{h.note}</p>}
            </div>
            <button
              type="button"
              aria-label="Remove this highlight"
              title="Remove"
              disabled={removing === h.id}
              onClick={() => void remove(h.id)}
              className="h-7 w-7 shrink-0 self-start rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-[var(--hover)] hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <HugeiconsIcon icon={Trash} strokeWidth={2} className="mx-auto h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
