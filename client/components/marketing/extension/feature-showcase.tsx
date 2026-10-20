"use client";

import Image from "next/image";
import { useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// Adapted from @glint-ui/feature-showcase: a list of features where the open one
// shows its description, and its picture crossfades in beside it. The timer is
// a ring around the open feature's icon, a CSS animation whose `animationend`
// moves to the next feature, so pausing is just animation-play-state: with the
// pause button, or while the pointer or keyboard focus (not a click's) is in the
// list, reading a description. With reduced motion it starts paused; play starts it.
const css = `
@keyframes fs-ring{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
.fs-ring{animation:fs-ring var(--fs-dur) linear forwards}
.fs-root[data-playing="false"] .fs-ring,.fs-list:hover .fs-ring,.fs-list:has(:focus-visible) .fs-ring{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.fs-visual{transition:none!important}}
`;

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export interface ShowcaseFeature {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  /** Shown beside the list while this feature is open. */
  visual: ReactNode;
}

export function FeatureShowcase({ features, interval = 6500 }: { features: ShowcaseFeature[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // restarts the timer when the same one is picked again
  const reducedMotion = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // null until the person presses pause or play; until then, reduced motion decides.
  const [paused, setPaused] = useState<boolean | null>(null);
  const playing = paused === null ? !reducedMotion : !paused;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const n = features.length;

  const select = (i: number, focus = false) => {
    const next = (i + n) % n;
    setActive(next);
    setCycle((c) => c + 1);
    if (focus) tabs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowDown: active + 1, ArrowRight: active + 1, ArrowUp: active - 1, ArrowLeft: active - 1, Home: 0, End: n - 1 };
    if (e.key in map) {
      e.preventDefault();
      select(map[e.key], true);
    }
  };

  return (
    <div data-playing={playing} className="fs-root grid w-full items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14" style={{ "--fs-dur": `${interval}ms` } as CSSProperties}>
      <style href="extension-feature-showcase" precedence="default">
        {css}
      </style>

      <div role="tablist" aria-orientation="vertical" aria-label="What the extension does" onKeyDown={onKey} className="fs-list grid gap-1.5">
        {features.map((f, i) => {
          const on = i === active;
          return (
            <button
              key={f.title}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-t${i}`}
              aria-selected={on}
              aria-controls={`${id}-p`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i)}
              className={cn(
                "group relative overflow-hidden rounded-2xl px-4 py-3.5 text-left outline-none transition-[background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-primary/40",
                on ? "bg-card shadow-sm ring-1 ring-foreground/[0.07]" : "hover:bg-muted/60",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="relative grid size-8 shrink-0 place-items-center">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full transition-colors duration-300 [&_svg]:size-4",
                      on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {f.icon}
                  </span>
                  {/* The timer: fills around the icon, then the next feature opens. */}
                  {on && (
                    <svg aria-hidden viewBox="0 0 44 44" className="pointer-events-none absolute -inset-2 size-12 -rotate-90">
                      <circle cx="22" cy="22" r="20" fill="none" strokeWidth="2.25" className="stroke-foreground/15" />
                      <circle
                        key={cycle}
                        cx="22"
                        cy="22"
                        r="20"
                        fill="none"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        pathLength={100}
                        strokeDasharray="100"
                        className="fs-ring stroke-primary"
                        onAnimationEnd={() => select(active + 1)}
                      />
                    </svg>
                  )}
                </span>
                <span className={cn("text-[15px] font-medium transition-colors", on ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{f.title}</span>
              </span>
              {/* grid-rows 0fr -> 1fr opens to the description's own height */}
              <span className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <span className="overflow-hidden pl-11 text-[14.5px] leading-relaxed text-muted-foreground">
                  <span className="block pt-1.5">{f.description}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-p`}
        aria-labelledby={`${id}-t${active}`}
        className="relative order-first aspect-[4/3.4] w-full overflow-hidden rounded-[1.75rem] bg-muted/70 ring-1 ring-foreground/[0.06] lg:sticky lg:top-28 lg:order-none"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_60%),radial-gradient(90%_70%_at_100%_100%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_55%)]" />
        {features.map((f, i) => (
          <div
            key={f.title}
            aria-hidden={i !== active}
            inert={i !== active}
            className={cn(
              "fs-visual absolute inset-0 transition-[opacity,scale,filter] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
              i === active ? "scale-100 opacity-100 blur-0" : "pointer-events-none scale-[1.04] opacity-0 blur-sm",
            )}
          >
            {f.visual}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPaused(playing)}
          aria-label={playing ? "Pause the slideshow" : "Play the slideshow"}
          title={playing ? "Pause" : "Play"}
          className="absolute right-4 bottom-4 z-10 grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
          <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} strokeWidth={2} className="size-4" />
        </button>
      </div>
    </div>
  );
}

const SHOT = "rounded-xl bg-white shadow-[0_30px_70px_-24px_rgba(20,40,120,0.35)] ring-1 ring-black/[0.06] dark:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.8)]";

/** A screenshot of the popup or side panel (2x images), centred and fitted to the frame. */
export function Shot({ src, width, height, alt, className }: { src: string; width: number; height: number; alt: string; className?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6 sm:p-10">
      <Image src={src} width={width / 2} height={height / 2} alt={alt} className={cn("h-auto max-h-full w-auto max-w-full", SHOT, className)} />
    </div>
  );
}

/** A screenshot of a web page, in a plain browser window. */
export function BrowserShot({ src, width, height, alt, url }: { src: string; width: number; height: number; alt: string; url: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-5 sm:p-8">
      <div className={cn("w-full overflow-hidden", SHOT)}>
        <div className="flex h-8 items-center gap-3 border-b border-black/[0.06] bg-[#f1f2f6] px-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
            <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
            <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
          </span>
          <span className="flex h-5 flex-1 items-center truncate rounded-full bg-white px-3 text-[11px] text-[#6b6f7b]">{url}</span>
        </div>
        <Image src={src} width={width / 2} height={height / 2} alt={alt} className="block h-auto w-full" />
      </div>
    </div>
  );
}
