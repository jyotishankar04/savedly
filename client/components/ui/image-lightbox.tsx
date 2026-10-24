"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as Prev, ArrowRight01Icon as Next, Cancel01Icon as Close, LinkSquare02Icon as External } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  src: string;
  alt: string;
}

/**
 * Pictures full screen, over the page: the one clicked, with ← → (or a
 * swipe, on a phone) to the others; Esc, the × or a click outside the
 * picture closes it. Focus moves into it and back to where it was after.
 */
export function ImageLightbox({ images, index, onClose, onIndexChange, originalUrl }: { images: LightboxImage[]; index: number | null; onClose: () => void; onIndexChange: (index: number) => void; originalUrl?: string }) {
  const open = index !== null && !!images[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);
  const touchX = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const many = images.length > 1;

  const go = useCallback(
    (step: number) => {
      if (index === null || !many) return;
      setLoaded(false);
      onIndexChange((index + step + images.length) % images.length);
    },
    [index, images.length, many, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [go, onClose, open]);

  if (!open || typeof document === "undefined") return null;
  const image = images[index!]!;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || "Picture"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in-0 duration-150"
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined || Math.abs(end - start) < 50) return;
        go(end < start ? 1 : -1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a picture from anywhere, shown as it is */}
      <img
        key={image.src}
        src={image.src}
        alt={image.alt}
        onLoad={() => setLoaded(true)}
        onClick={(e) => e.stopPropagation()}
        className={cn("max-h-[90dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
      />

      <div className="absolute right-3 top-3 flex items-center gap-2 pt-[env(safe-area-inset-top)]" onClick={(e) => e.stopPropagation()}>
        {originalUrl && (
          <a href={originalUrl} target="_blank" rel="noreferrer" aria-label="Open the original" title="Open the original" className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <HugeiconsIcon icon={External} strokeWidth={2} className="size-4.5" />
          </a>
        )}
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <HugeiconsIcon icon={Close} strokeWidth={2} className="size-5" />
        </button>
      </div>

      {many && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous picture" className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:grid">
            <HugeiconsIcon icon={Prev} strokeWidth={2} className="size-5" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next picture" className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:grid">
            <HugeiconsIcon icon={Next} strokeWidth={2} className="size-5" />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums text-white/90 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
            {index! + 1} / {images.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
