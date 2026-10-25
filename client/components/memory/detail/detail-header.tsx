"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon as Star, ArrowLeft01Icon as ArrowLeft, AlarmClockIcon as Alarm } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { MemoryActionsMenu } from "@/components/memory/memory-actions-menu";
import { useRemindMe } from "@/components/memory/remind-me";
import { EditableTitle } from "@/components/memory/editable-title";
import { formatRemindAt } from "@/lib/remind";
import { timeAgo } from "@/lib/time";
import { useToggleFavoriteMutation } from "@/context/MemoryContext";
import type { MemoryDetail } from "@/types/memory";
import { formatSavedDate, TYPE_META } from "./helpers";

/** The top bar (back, favorite, actions) and the title block. */
export function DetailHeader({
  memory,
  meta,
  processing,
  isNote,
  openedAt,
}: {
  memory: MemoryDetail;
  meta: (typeof TYPE_META)[keyof typeof TYPE_META];
  processing: boolean;
  isNote: boolean;
  openedAt: number;
}) {
  const router = useRouter();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const remindMe = useRemindMe();

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold hover:text-foreground flex items-center gap-1 text-muted-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to library
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFavoriteMutation.mutate({ id: memory.id, isFavorite: !memory.isFavorite })}
            aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={memory.isFavorite}
            className="h-9 w-9 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <HugeiconsIcon icon={Star} strokeWidth={2.25} className={cn("h-4 w-4", memory.isFavorite && "fill-amber-500 text-amber-500")} />
          </button>
          <MemoryActionsMenu memory={memory} redirectTo="/app/memories" />
        </div>
      </div>

      {/* Title */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-foreground">
            <HugeiconsIcon icon={meta.icon} strokeWidth={2.25} className="h-3.5 w-3.5 text-primary" />
            {meta.label}
          </span>
          {memory.source && !isNote && (
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-xs">{memory.source}</span>
          )}
          {processing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
              <LogoMark ticks={false} className="h-3 w-3 animate-pulse" />
              Reading it now
            </span>
          )}
        </div>
        <EditableTitle id={memory.id} title={memory.title} className="text-2xl font-bold tracking-tight text-foreground text-balance break-words" />
        <p className="text-xs text-muted-foreground">
          Saved {formatSavedDate(memory.createdAt)} · {timeAgo(memory.createdAt)}
          {memory.remindAt && new Date(memory.remindAt).getTime() > openedAt && (
            <>
              {" · "}
              <button type="button" onClick={() => void remindMe.remind([memory])} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <HugeiconsIcon icon={Alarm} strokeWidth={2} className="h-3.5 w-3.5" />
                Back {formatRemindAt(memory.remindAt)}
              </button>
            </>
          )}
        </p>
        {remindMe.element}
      </header>
    </>
  );
}
