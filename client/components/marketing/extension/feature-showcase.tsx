"use client";

import Image from "next/image";
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Adapted from @glint-ui/feature-showcase: a list of features where the open one
// shows its description and a filling bar, and its picture crossfades in beside
// it. The bar is a CSS animation whose `animationend` moves to the next feature,
// so pausing (pointer or keyboard focus inside) is just animation-play-state.
// Reduced motion stops the bar, and with it the advancing.
const css = `
@keyframes fs-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.fs-bar{transform-origin:left;animation:fs-fill var(--fs-dur) linear forwards}
.fs-root:is(:hover,:focus-within) .fs-bar{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.fs-bar{animation:none;transform:scaleX(1)}.fs-visual{transition:none!important}}
`;

export interface ShowcaseFeature {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  /** Shown beside the list while this feature is open. */
  visual: ReactNode;
}

export function FeatureShowcase({ features, interval = 6500 }: { features: ShowcaseFeature[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // restarts the bar when the same one is picked again
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
    <div className="fs-root grid w-full items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14" style={{ "--fs-dur": `${interval}ms` } as CSSProperties}>
      <style href="extension-feature-showcase" precedence="default">
        {css}
      </style>

      <div role="tablist" aria-orientation="vertical" aria-label="What the extension does" onKeyDown={onKey} className="grid gap-1.5">
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
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300 [&_svg]:size-4",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {f.icon}
                </span>
                <span className={cn("text-[15px] font-medium transition-colors", on ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{f.title}</span>
              </span>
              {/* grid-rows 0fr -> 1fr opens to the description's own height */}
              <span className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <span className="overflow-hidden pl-11 text-[14.5px] leading-relaxed text-muted-foreground">
                  <span className="block pt-1.5">{f.description}</span>
                </span>
              </span>
              {on && (
                <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-muted">
                  <span key={cycle} className="fs-bar block h-full bg-primary" onAnimationEnd={() => select(active + 1)} />
                </span>
              )}
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
