"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
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
      className="mt-16 md:mt-24 text-left mx-auto w-full max-w-6xl"
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

const sectionVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.16 } },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", duration: 0.75, bounce: 0 },
  },
};

const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98, filter: "blur(8px)" },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { type: "spring", duration: 0.85, bounce: 0 },
  },
};

const skylightVariants: Variants = {
  hidden: { opacity: 0, y: -18, scale: 0.96, filter: "blur(12px)" },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { type: "spring", duration: 1.05, bounce: 0 },
  },
};

export function HeroProduct() {
  const cta = useAuthCta();

  return (
    // z-40: `isolate` makes this section its own stacking layer, and the fixed
    // navbar lives inside it. Without a level of its own, anything with a
    // z-index further down the page would draw over the navbar.
    <section className="relative isolate z-40 overflow-hidden bg-background selection:bg-primary/25 font-sans antialiased">
      {/* Light Mode Background */}
      <motion.img
        variants={skylightVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        src="/landing/hero-bg-light.jpg"
        alt=""
        className="blur-sm pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-60 dark:hidden"
      />
      
      {/* Dark Mode Background */}
      <motion.img
        variants={skylightVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        src="/landing/hero-bg-dark.jpg"
        alt=""
        className="blur-sm hidden pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-top opacity-40 dark:block"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/10 via-background/60 to-background" />

      <Navbar />
      <motion.div
        className="relative flex w-full flex-col overflow-hidden px-5 sm:px-8 lg:px-9 pt-32 md:pt-40"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        variants={sectionVariants}
      >
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center pb-14 text-center">
          
          <motion.h1
            variants={riseVariants}
            className="max-w-5xl text-[clamp(2.25rem,4.6vw,4.25rem)] leading-[1.12] font-semibold tracking-[-0.03em] text-balance text-foreground"
          >
            <span className="block">Save it now.</span>
            <span className="block md:whitespace-nowrap">Find it when you need it.</span>
            <span className="mt-4 block font-[Georgia,serif] text-[0.58em] leading-[1.3] font-normal tracking-[-0.02em] text-primary italic md:mt-5 md:whitespace-nowrap">
              Without remembering where you put it.
            </span>
          </motion.h1>

          <motion.p
            variants={riseVariants}
            className="mt-8 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground"
          >
            Links, notes, screenshots, PDFs, and videos—all the things you don&apos;t want to lose. Savedly keeps them organized and helps you find them again, even when you don&apos;t remember what you called them.
          </motion.p>

          <motion.div variants={ctaVariants} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={cta.href}
              className="group inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96]"
            >
              {cta.isAuthenticated ? cta.label : "Start saving"}
              <HugeiconsIcon icon={ArrowRightIcon} className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <GithubStarButton variant="hero" label="Explore on GitHub" />
          </motion.div>
          
          <motion.p variants={ctaVariants} className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {SHOWCASE_MODE ? "Early access: join the waitlist" : "Free to use · Open source · Self-hostable"}
          </motion.p>
        </div>

        <ProductTabs />
      </motion.div>
    </section>
  );
}

export default HeroProduct;
