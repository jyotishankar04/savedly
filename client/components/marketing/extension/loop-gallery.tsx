"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useSpring } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";

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

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Player({ loop, onClose }: { loop: Loop; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(true);
  const [now, setNow] = useState(0);
  const [length, setLength] = useState(0);
  const titleId = useId();

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && document.activeElement?.tagName !== "BUTTON" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        const v = video.current;
        if (v) void (v.paused ? v.play() : v.pause());
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const toggle = () => {
    const v = video.current;
    if (v) void (v.paused ? v.play() : v.pause());
  };

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
          <video
            ref={video}
            src={`/extension/loops/${loop.src}.mp4`}
            poster={`/extension/loops/${loop.src}-still.webp`}
            autoPlay
            muted
            loop
            playsInline
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            className="block aspect-video max-h-[calc(100dvh-10rem)] w-full cursor-pointer bg-black object-contain"
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-white sm:px-6 sm:pb-4"
          >
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause video" : "Play video"}
              className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            >
              <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} strokeWidth={2} className="size-4 fill-white" />
            </button>
            <input
              type="range"
              min={0}
              max={length || 1}
              step={0.01}
              value={now}
              aria-label="Seek"
              aria-valuetext={`${time(now)} of ${time(length)}`}
              onChange={(e) => {
                const v = video.current;
                if (v) v.currentTime = Number(e.target.value);
                setNow(Number(e.target.value));
              }}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-white [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              style={{ background: `linear-gradient(to right, white ${(now / (length || 1)) * 100}%, rgba(255,255,255,.25) 0)` }}
            />
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/85">
              {time(now)} / {time(length)}
            </span>
          </motion.div>
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
