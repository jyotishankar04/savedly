"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRightIcon } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import { GithubStarButton } from "@/components/marketing/github-star-button";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { SHOWCASE_MODE } from "@/lib/showcase";
import { cn } from "@/lib/utils";
import { BrowserFrame, ProductShot, SCREENS, type ScreenName } from "@/components/marketing/landing/product-frame";

const EASE = [0.16, 1, 0.3, 1] as const;

const TABS: { id: ScreenName; label: string; caption: string }[] = [
  { id: "home", label: "Home", caption: "Everything you saved, and a search box that understands what you meant." },
  { id: "ask", label: "Ask", caption: "Ask in plain English. Every answer lists the memories it came from." },
  { id: "search", label: "Search", caption: "The exact word or just the gist. Both are searched and ranked together." },
  { id: "memories", label: "Memories", caption: "Links, videos, screenshots and notes, grouped by the day you saved them." },
];
const ROTATE_MS = 6500;

// The six real memory types (types/memory.ts), placed around one library.
// Coordinates share the SVG's 420x360 box so labels and lines line up.
const NODES = [
  { label: "article", x: 78, y: 58 },
  { label: "video", x: 330, y: 44 },
  { label: "screenshot", x: 372, y: 196 },
  { label: "pdf", x: 318, y: 318 },
  { label: "voice memo", x: 92, y: 306 },
  { label: "note", x: 40, y: 188 },
];
const HUB = { x: 212, y: 182 };

function SignalDiagram({ className }: { className?: string }) {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className={cn("relative aspect-[420/360] w-full max-w-[440px]", className)} aria-hidden>
      <svg viewBox="0 0 420 360" className="absolute inset-0 h-full w-full overflow-visible">
        {NODES.map((n) => (
          <g key={n.label}>
            <line x1={n.x} y1={n.y} x2={HUB.x} y2={HUB.y} className="stroke-foreground/15" strokeWidth={1} />
            <line
              x1={n.x}
              y1={n.y}
              x2={HUB.x}
              y2={HUB.y}
              className="stroke-primary [animation:signal-flow_1.8s_linear_infinite] motion-reduce:[animation:none]"
              strokeWidth={1.5}
              strokeDasharray="3 11"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
      {NODES.map((n) => (
        <span
          key={n.label}
          style={{ left: pct(n.x, 420), top: pct(n.y, 360) }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-background px-2 py-1 font-mono text-[11px] whitespace-nowrap text-foreground ring-1 ring-foreground/15"
        >
          {n.label}
        </span>
      ))}
      <span
        style={{ left: pct(HUB.x, 420), top: pct(HUB.y, 360) }}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 font-mono text-xs font-medium whitespace-nowrap text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]"
      >
        your library
      </span>
    </div>
  );
}

function ProductTabs() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<ScreenName>("home");
  const [paused, setPaused] = useState(false);
  const [touched, setTouched] = useState(false);

  // Walks the tabs on its own until the visitor picks one; never under
  // reduced motion, and it holds while the pointer is over the window.
  useEffect(() => {
    if (reduce || touched || paused) return;
    const t = setTimeout(() => {
      setActive((cur) => TABS[(TABS.findIndex((x) => x.id === cur) + 1) % TABS.length].id);
    }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [active, reduce, touched, paused]);

  const current = TABS.find((t) => t.id === active)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 48, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE, delay: 0.55 }}
      className="mt-16 md:mt-20"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="App screens" className="flex w-fit gap-1 rounded-full bg-foreground/5 p-1">
          {TABS.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`screen-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls="screen-panel"
                onClick={() => {
                  setActive(tab.id);
                  setTouched(true);
                }}
                className={cn(
                  "relative h-8 overflow-hidden rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  selected ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {selected && !touched && !reduce && (
                  <span
                    key={active}
                    aria-hidden
                    className={cn("absolute inset-x-3 bottom-1 h-px origin-left bg-primary", paused ? "[animation-play-state:paused]" : "")}
                    style={{ animation: `tab-progress ${ROTATE_MS}ms linear forwards` }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="max-w-sm text-sm text-muted-foreground sm:text-right">
          {current.caption}
        </p>
      </div>

      <BrowserFrame url={SCREENS[active].path}>
        <div id="screen-panel" role="tabpanel" aria-labelledby={`screen-tab-${active}`} className="relative">
          {TABS.map((tab, i) => (
            <div
              key={tab.id}
              aria-hidden={tab.id !== active}
              className={cn(
                "transition-[opacity,filter] duration-500 ease-out",
                i === 0 ? "relative" : "absolute inset-0",
                tab.id === active ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[2px]",
              )}
            >
              <ProductShot name={tab.id} priority={i === 0} />
            </div>
          ))}
        </div>
      </BrowserFrame>
    </motion.div>
  );
}

export function HeroProduct() {
  const cta = useAuthCta();
  const reduce = useReducedMotion();
  // The start state is always declared (server and client agree); reduced
  // motion only makes the transition instant, so content is never left hidden.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section className="relative overflow-hidden bg-background selection:bg-primary/25">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-5 pt-32 pb-8 sm:px-6 md:pt-40">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <motion.h1
              {...rise(0.05)}
              className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-[4.5rem]"
            >
              Save anything.
              <br />
              Ask it anything.
            </motion.h1>
            <motion.p {...rise(0.18)} className="mt-6 max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground">
              Articles, PDFs, screenshots, voice notes, YouTube links. Each one is read, transcribed, summarized and tagged on the
              way in, then searchable by meaning and answerable in plain English.
            </motion.p>
            <motion.div {...rise(0.3)} className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={cta.href}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
              >
                {cta.label}
                <HugeiconsIcon icon={ArrowRightIcon} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <GithubStarButton variant="hero" />
              <Link
                href="/features"
                className="hidden h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-foreground underline-offset-4 hover:underline sm:inline-flex"
              >
                See what it does
              </Link>
            </motion.div>
            <motion.p {...rise(0.4)} className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {SHOWCASE_MODE ? "Early access: join the waitlist" : "Free and open source, with no limits"}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 1.2, ease: EASE, delay: 0.25 }}
            className="hidden w-full max-w-[440px] justify-self-end lg:block"
          >
            <SignalDiagram />
          </motion.div>
        </div>

        <ProductTabs />
      </div>
    </section>
  );
}

export default HeroProduct;
