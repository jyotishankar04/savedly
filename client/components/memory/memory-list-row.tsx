"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon as MoreHorizontal, StarIcon as Star } from "@hugeicons/core-free-icons";
import { MemoryActionsMenu } from "@/components/memory/memory-actions-menu";
import { SelectCheckbox, selectableProps } from "@/components/selection/select-checkbox";
import { toast } from "@/components/ui/toast";
import { useToggleFavoriteMutation } from "@/context/MemoryContext";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Memory } from "@/types/memory";

/**
 * A memory as one row of a list (list view from sm up; a phone shows the
 * smaller cards instead): its type, title and site, when it was saved, a star
 * and the actions menu. Selectable like the cards.
 */
export function MemoryListRow({
  item,
  onOpen,
  selected = false,
  selecting = false,
  onSelect,
}: {
  item: Memory;
  onOpen: () => void;
  selected?: boolean;
  selecting?: boolean;
  onSelect: (event: { shiftKey?: boolean }) => void;
}) {
  const toggleFavorite = useToggleFavoriteMutation();
  const TypeIcon = MEMORY_TYPE_ICONS[item.type];

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      {...selectableProps(selecting, onSelect, { id: item.id, title: item.title, selected })}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected && "bg-primary/10 hover:bg-primary/10",
      )}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <HugeiconsIcon icon={TypeIcon} strokeWidth={2} className={cn("h-4.5 w-4.5 transition-opacity", (selecting || selected) && "opacity-0")} />
        <SelectCheckbox checked={selected} selecting={selecting} onToggle={(e) => onSelect(e)} label={`Select ${item.title}`} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{item.title}</p>
        <p className="truncate text-[13px] text-muted-foreground">{item.source}</p>
      </div>
      {/* The menu is portalled, but React passes its clicks up to the row: stopped here, as on the cards. */}
      <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <span className="mr-2 hidden tabular-nums sm:inline">{timeAgo(item.createdAt)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate(
              { id: item.id, isFavorite: !item.isFavorite },
              { onError: (err) => toast.add({ title: "Couldn't update favorite", description: err instanceof Error ? err.message : undefined, type: "error" }) },
            );
          }}
          aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-amber-500"
        >
          <HugeiconsIcon icon={Star} strokeWidth={2} className={cn("h-4 w-4", item.isFavorite && "fill-amber-500 text-amber-500")} />
        </button>
        <MemoryActionsMenu
          memory={item}
          trigger={
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <HugeiconsIcon icon={MoreHorizontal} strokeWidth={2} className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </div>
  );
}
