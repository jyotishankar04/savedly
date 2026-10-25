"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ExternalLinkIcon as ExternalLink } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { memoryQueryKey } from "@/context/MemoryContext";
import { toast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { reprocessMemory } from "@/lib/memories";
import { getPlatformFallback } from "@/lib/platform-fallback";
import type { MemoryDetail } from "@/types/memory";
import { isShortLink, SOCIAL_PLATFORMS, TYPE_META } from "./helpers";

/** What a link, image, document or voice memory shows: its preview, the original link, and the status of reading it. */
export function LinkPreviewSection({
  memory,
  meta,
  processing,
}: {
  memory: MemoryDetail;
  meta: (typeof TYPE_META)[keyof typeof TYPE_META];
  processing: boolean;
}) {
  const queryClient = useQueryClient();
  const [readingPost, setReadingPost] = useState(false);
  const [viewingPicture, setViewingPicture] = useState(false);
  // A preview picture that doesn't load (gone, blocked) falls back to the no-preview tile.
  const [previewFailed, setPreviewFailed] = useState<string | null>(null);

  return (
            <section className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-muted/40 overflow-hidden relative">
                {processing && (
                  <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                )}
                {memory.previewImageUrl && previewFailed !== memory.previewImageUrl ? (
                  // The picture opens full screen here; an uploaded image is shown whole, a link's preview as a banner.
                  <button type="button" onClick={() => setViewingPicture(true)} aria-label="View the picture full screen" className="block w-full cursor-zoom-in">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview image */}
                    <img
                      src={memory.previewImageUrl}
                      alt={memory.title}
                      onError={() => setPreviewFailed(memory.previewImageUrl)}
                      className={memory.type === "image" ? "mx-auto max-h-[560px] w-full object-contain" : "w-full aspect-video object-cover"}
                    />
                  </button>
                ) : memory.platform && (memory.type === "web" || memory.type === "video") ? (
                  (() => {
                    const fallback = getPlatformFallback(memory.platform);
                    return (
                      <div className={cn("h-44 flex flex-col items-center justify-center gap-2 text-white", fallback.gradientClassName)}>
                        <HugeiconsIcon icon={meta.icon} strokeWidth={2.25} className="h-8 w-8" />
                        <span className="text-xs font-bold tracking-wide">{fallback.label}</span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={meta.icon} strokeWidth={2} className="h-8 w-8 text-primary" />
                    <span className="text-[11px] font-semibold">No preview for this {meta.label.toLowerCase()}</span>
                  </div>
                )}
              </div>

              <ImageLightbox
                images={memory.previewImageUrl ? [{ src: memory.previewImageUrl, alt: memory.title }] : []}
                index={viewingPicture ? 0 : null}
                onIndexChange={() => {}}
                onClose={() => setViewingPicture(false)}
                originalUrl={memory.url ?? undefined}
              />

              {memory.url && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-muted-foreground truncate">{memory.canonicalUrl ?? memory.url}</span>
                  <a
                    href={memory.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    Open original <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* A post or video saved before Savedly could read them (or whose read failed): read it now. */}
              {!processing && memory.url && ((memory.platform && SOCIAL_PLATFORMS.has(memory.platform)) || isShortLink(memory.url)) && (
                <button
                  type="button"
                  disabled={readingPost}
                  onClick={async () => {
                    setReadingPost(true);
                    try {
                      await reprocessMemory(memory.id, { retitle: true });
                      await queryClient.invalidateQueries({ queryKey: memoryQueryKey(memory.id) });
                      toast.add({ title: "Reading the post", description: "It shows here in a moment.", type: "success" });
                    } catch (err) {
                      toast.add({ title: "Couldn't read it", description: err instanceof Error ? err.message : undefined, type: "error" });
                    } finally {
                      setReadingPost(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {readingPost ? "Reading…" : `Read the ${memory.type === "video" ? "video" : "post"}`}
                </button>
              )}

              {/* Plain-language preview status — never the raw fetchStatus (see docs/URL_CAPTURE_AND_PREVIEW.md's UI copy guidance). */}
              {!processing && memory.previewStatus && memory.previewStatus !== "available" && (
                <p className="text-[10px] text-muted-foreground">
                  {memory.previewSource === "browser"
                    ? "Preview captured from your browser."
                    : `Preview unavailable${memory.platform ? ` · ${getPlatformFallback(memory.platform).label}` : ""}.`}
                </p>
              )}
            </section>
  );
}
