"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon as Star, MoreHorizontalIcon as MoreHorizontal, Calendar03Icon as CalendarIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/time";
import { MemoryThumbnail } from "@/components/memory-thumbnail";
import { MemoryActionsMenu } from "@/components/memory/memory-actions-menu";
import { useToggleFavoriteMutation } from "@/context/MemoryContext";
import type { Memory } from "@/types/memory";

interface MemoryGridCardProps {
  item: Memory;
  /** Either navigates straight to the memory's own page, or (e.g. Memories'
   * preview drawer) runs custom behavior instead — pass exactly one. */
  href?: string;
  onClick?: () => void;
  /** Passed through to MemoryActionsMenu — where to navigate after archive/vault/trash succeeds. */
  redirectTo?: string;
}

const TYPE_LABEL: Record<Memory["type"], string> = {
  web: "Website",
  note: "Note",
  video: "Video",
  image: "Image",
  document: "File",
  voice: "Voice memo",
};

/** The memory grid card used on the memories list — also reused on Explore
 * and inside the vault, so vaulted memories look and behave exactly like
 * regular ones. */
export function MemoryGridCard({ item, href, onClick, redirectTo }: MemoryGridCardProps) {
  const toggleFavoriteMutation = useToggleFavoriteMutation();

  const className = cn(
    "group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30",
    (href || onClick) && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  );

  const content = (
    <>
      {item.type !== "note" ? (
        <MemoryThumbnail item={item} className="rounded-xl" />
      ) : (
        <div className="aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-0.5">
        <h3 className="line-clamp-1 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        {item.description && item.type !== "note" && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
        )}

        {item.tags.length > 0 && (
          <div className="mt-1 flex min-w-0 flex-wrap gap-1">
            {item.tags.slice(0, 2).map((t) => (
              <span key={t} className="max-w-24 truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <span className="shrink-0">{TYPE_LABEL[item.type]}</span>
            {item.eventAt && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-primary" title={new Date(item.eventAt).toLocaleString()}>
                <HugeiconsIcon icon={CalendarIcon} strokeWidth={2} className="h-3 w-3" />
                {new Date(item.eventAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums">{timeAgo(item.createdAt)}</span>
        </div>
      </div>

      {/* Overlaid rather than in the flow: keeps card height driven by
          content, and this row never has to compete with the title/date. */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={item.isFavorite}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteMutation.mutate(
              { id: item.id, isFavorite: !item.isFavorite },
              { onError: (err) => toast.add({ title: "Couldn't update favorite", description: err instanceof Error ? err.message : undefined, type: "error" }) },
            );
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/95 shadow-xs backdrop-blur-sm transition-colors hover:text-amber-500",
            item.isFavorite ? "text-amber-500 opacity-100!" : "text-muted-foreground",
          )}
        >
          <HugeiconsIcon icon={Star} strokeWidth={2} className={cn("h-3.5 w-3.5", item.isFavorite && "fill-amber-500")} />
        </button>

        <MemoryActionsMenu
          memory={item}
          redirectTo={redirectTo}
          trigger={
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/95 text-muted-foreground shadow-xs backdrop-blur-sm hover:text-foreground"
            >
              <HugeiconsIcon icon={MoreHorizontal} strokeWidth={2} className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={className}
    >
      {content}
    </div>
  );
}
