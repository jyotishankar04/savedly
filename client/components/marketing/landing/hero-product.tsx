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
      className="mt-16 md:mt-24 text-left"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="App screens" className="flex w-fit mx-auto sm:mx-0 gap-1 rounded-full bg-foreground/5 p-1">
          {TABS.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => {
                  setTouched(true);
                  setActive(tab.id);
                }}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {selected && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-foreground/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-right hidden sm:block" aria-live="polite">
          {current.caption}
        </p>
      </div>

      <BrowserFrame url={SCREENS[active].path}>
        <ProductShot name={active} priority={true} />
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
      <div className="mx-auto w-full max-w-5xl px-5 pt-32 pb-8 sm:px-6 md:pt-40 text-center">
        {/* Centered Hero Copy */}
        <motion.h1
          {...rise(0.05)}
          className="text-5xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-foreground sm:text-6xl md:text-[4.5rem] mx-auto"
        >
          Save anything.<br className="hidden sm:block" /> Ask it anything.
        </motion.h1>
        
        <motion.p {...rise(0.18)} className="mt-8 mx-auto max-w-2xl text-lg leading-relaxed text-balance text-muted-foreground">
          Articles, PDFs, screenshots, voice notes, YouTube links. Each one is read, transcribed, summarized and tagged on the way in, then searchable by meaning and answerable in plain English.
        </motion.p>
        
        {/* Centered CTAs */}
        <motion.div {...rise(0.3)} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={cta.href} className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]">
            {cta.label}
            <HugeiconsIcon icon={ArrowRightIcon} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <GithubStarButton variant="hero" />
        </motion.div>
        
        <motion.p {...rise(0.4)} className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          {SHOWCASE_MODE ? "Early access: join the waitlist" : "Free plan · open source · self-host it"}
        </motion.p>
        
        {/* Full-width App Frame */}
        <ProductTabs />
      </div>
    </section>
  );
}

export default HeroProduct;
