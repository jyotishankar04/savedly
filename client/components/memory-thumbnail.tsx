"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { Memory } from "@/types/memory";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { isMemoryProcessing } from "@/lib/memory-processing";
import { getPlatformFallback } from "@/lib/platform-fallback";

/**
 * Fallback chain (docs/URL_CAPTURE_AND_PREVIEW.md, extended): real preview
 * image -> platform-branded tile (link memory with a detected platform but
 * no image) -> the site's own favicon (an unrecognized site whose fetch was
 * blocked/limited still usually has one) -> generic type-icon tile. Never
 * renders a blank box. A small badge overlays while AI ingestion is still
 * running.
 */
export function MemoryThumbnail({ item, className }: { item: Memory; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const TypeIcon = MEMORY_TYPE_ICONS[item.type];
  const isProcessing = isMemoryProcessing(item);

  return (
    <div className="relative">
      {item.previewImageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview images
        <img
          src={item.previewImageUrl}
          alt=""
          onError={() => setFailed(true)}
          className={cn("aspect-video w-full rounded-md object-cover border border-border/30", className)}
        />
      ) : item.platform ? (
        (() => {
          const fallback = getPlatformFallback(item.platform);
          return (
            <div
              className={cn(
                "aspect-video w-full rounded-md border border-border/30 overflow-hidden flex flex-col items-center justify-center gap-1 text-white select-none",
                fallback.gradientClassName,
                className
              )}
            >
              <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} className="h-4 w-4" />
              <span className="text-[9px] font-bold tracking-wide">{fallback.label}</span>
            </div>
          );
        })()
      ) : item.faviconUrl && !faviconFailed ? (
        <div
          className={cn(
            "aspect-video w-full rounded-md bg-muted border border-border/30 overflow-hidden flex flex-col items-center justify-center gap-1.5 select-none",
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain favicon */}
          <img src={item.faviconUrl} alt="" onError={() => setFaviconFailed(true)} className="h-6 w-6 rounded-sm object-contain" />
          {item.source && <span className="text-[8px] text-muted-foreground font-mono truncate max-w-[85%]">{item.source}</span>}
        </div>
      ) : (
        <div
          className={cn(
            "aspect-video w-full rounded-md bg-muted border border-border/30 overflow-hidden flex items-center justify-center gap-1 text-[8px] text-muted-foreground font-semibold select-none",
            className
          )}
        >
          <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} className={cn("h-3.5 w-3.5", item.type === "video" ? "text-red-500" : "text-primary")} />
          <span>{item.type === "web" ? "No preview" : item.type}</span>
        </div>
      )}

      {isProcessing && (
        <>
          {/* Diagonal light sweep across the tile — same shape as ChatGPT's image-generating shimmer. */}
          <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-md", className)}>
            <div className="absolute inset-y-0 left-0 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>

          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full border border-primary/20 bg-background/90 px-1.5 py-0.5 text-[8px] font-bold text-primary shadow-sm backdrop-blur-sm">
            <LogoMark ticks={false} className="h-3 w-3 animate-pulse" />
            <span>Processing</span>
          </div>
        </>
      )}
    </div>
  );
}
