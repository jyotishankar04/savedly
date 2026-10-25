"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useSpring } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { VideoPlayer } from "@/components/ui/video-player";

export interface Loop {
  /** File name under /extension/loops: {src}.webp loops on the page, {src}.mp4 plays in the player, {src}-still.webp for reduced motion. */
  src: string;
  title: string;
  text: string;
}

// After skiper-ui's showreel (Skiper67): on the page each clip loops silently
// with a "Play" label that follows the pointer; clicking opens it large, grown
// out of the clip (a shared layout animation), with play/pause and a scrubber.
// Esc, the close button or a click outside closes it; focus goes back to the clip.

export function LoopGallery({ loops }: { loops: Loop[] }) {
  const [open, setOpen] = useState<Loop | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
        {loops.map((loop) => (
          <LoopCard
            key={loop.src}
            loop={loop}
            hidden={open?.src === loop.src}
            onOpen={(el) => {
              opener.current = el;
              setOpen(loop);
            }}
          />
        ))}
      </div>
      <AnimatePresence onExitComplete={() => opener.current?.focus()}>{open && <Player loop={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}

function LoopCard({ loop, hidden, onOpen }: { loop: Loop; hidden: boolean; onOpen: (el: HTMLElement) => void }) {
  const spring = { mass: 0.1 };
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const opacity = useSpring(0, spring);

  return (
    <figure>
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const bounds = e.currentTarget.getBoundingClientRect();
          x.set(e.clientX - bounds.left);
          y.set(e.clientY - bounds.top);
          opacity.set(1);
        }}
        onPointerLeave={() => opacity.set(0)}
        aria-label={`Play: ${loop.title}`}
        className="group relative block w-full cursor-none overflow-hidden rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background [@media(hover:none)]:cursor-pointer"
      >
        {/* While it plays large, the clip's place is held empty so the player can grow out of it and back into it. */}
        {hidden ? (
          <div className="aspect-video w-full rounded-2xl bg-muted/50" />
        ) : (
          <motion.div layoutId={`loop-${loop.src}`} className="overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/[0.08]">
            <picture>
              <source media="(prefers-reduced-motion: reduce)" srcSet={`/extension/loops/${loop.src}-still.webp`} />
              {/* A plain img: an animated WebP, which the image optimizer would flatten to one frame. */}
              <img src={`/extension/loops/${loop.src}.webp`} alt="" width={1280} height={720} loading="lazy" decoding="async" className="block aspect-video h-auto w-full" />
            </picture>
          </motion.div>
        )}
        {/* Follows the pointer; blends so it reads on light and dark parts of the clip. */}
        <motion.span
          aria-hidden
          style={{ x, y, opacity }}
          className="pointer-events-none absolute top-0 left-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 text-sm font-medium text-white mix-blend-exclusion select-none"
        >
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-4 fill-white" />
          Play
        </motion.span>
        {/* Touch screens and keyboard focus get a fixed label instead. */}
        <span
          aria-hidden
          className="absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur group-focus-visible:flex [@media(hover:none)]:flex"
        >
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-3.5 fill-white" />
          Play
        </span>
      </button>
      <figcaption className="mt-4">
        <span className="block text-base font-medium text-foreground">{loop.title}</span>
        <span className="mt-1 block text-[15px] leading-relaxed text-muted-foreground">{loop.text}</span>
      </figcaption>
    </figure>
  );
}

function Player({ loop, onClose }: { loop: Loop; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.15 } }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-background/90 backdrop-blur-lg"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl">
        {/* Above the video, so it never covers the recording's own toolbar. */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-12 right-0 grid size-9 place-items-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </motion.div>
        <motion.div
          layoutId={`loop-${loop.src}`}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className="relative overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-foreground/10"
        >
          {/* Savedly's own player (components/ui/video-player), as on saved posts. */}
          <VideoPlayer
            src={`/extension/loops/${loop.src}.mp4`}
            poster={`/extension/loops/${loop.src}-still.webp`}
            aspect={16 / 9}
            label={loop.title}
            autoPlay
            muted
            loop
            className="max-h-[calc(100dvh-10rem)] rounded-none border-0"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="mt-4 text-center">
          <p id={titleId} className="text-base font-medium text-foreground">
            {loop.title}
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">{loop.text}</p>
        </motion.div>
      </div>
    </div>
  );
}
