"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { motion, MotionConfig, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GiftIcon as Gift, SparklesIcon as Sparkles, ServerStack01Icon as Server } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { LogoMark } from "@/components/logo";
import { GITHUB_URL, LICENSE } from "@/lib/open-source";
import { BOOKING_URL } from "@/lib/booking";
import { SUPPORT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// The About page. An editorial page: one large line, short centred
// paragraphs, the kinds of things people save scattered around one
// statement, then the ways to get involved on a picture. Every claim is
// something the product does today. No numbers, customers, team size or
// backers are given, because none are on record. The scattered pictures are
// the landing page's demo library (public/landing/demo), invented link
// previews, not real sites.
//
// Movement is split between two libraries. GSAP drives what follows the
// scroll (the headline's words, the drifting saved items, the beliefs
// lighting up, the panel opening out); Motion handles things that simply
// appear or respond to the pointer. Both stand still for anyone whose system
// asks for reduced motion.

const EASE = [0.16, 1, 0.3, 1] as const;

// One font throughout, the site's sans; headings differ only by size, weight and spacing.
const PROSE = "text-lg leading-relaxed text-foreground sm:text-xl";
const UNDERLINE = "underline decoration-foreground/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-foreground";

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};
const stagger = (gap: number): Variants => ({ hidden: {}, shown: { transition: { staggerChildren: gap } } });

/** Two overlapping saved items. `flip` mirrors which one sits in front. */
function Pair({ back, front, flip, className }: { back: string; front: string; flip?: boolean; className?: string }) {
  const tile = "absolute aspect-[40/21] w-[68%] overflow-hidden rounded-[18px] bg-muted shadow-xl shadow-black/10 ring-1 ring-foreground/10 sm:rounded-[22px]";
  return (
    <div aria-hidden className={cn("relative aspect-[16/11] w-full", className)}>
      <div data-back className={cn(tile, "top-0", flip ? "left-0 -rotate-2" : "right-0 rotate-2")}>
        <Image src={`/landing/demo/${back}.webp`} alt="" fill sizes="(min-width: 1024px) 200px, 40vw" className="object-cover" />
      </div>
      <div data-front className={cn(tile, "bottom-0", flip ? "right-0 rotate-1" : "left-0 -rotate-1")}>
        <Image src={`/landing/demo/${front}.webp`} alt="" fill sizes="(min-width: 1024px) 200px, 40vw" className="object-cover" />
      </div>
    </div>
  );
}

const WAYS_IN: { label: string; action: string; href: string; external?: boolean }[] = [
  { label: "Read the code, or star it", action: "GitHub", href: GITHUB_URL, external: true },
  { label: "Run your own copy", action: "Guide", href: "/help/docs/self-host/self-host" },
  { label: "Report something broken", action: "Report", href: "/report" },
  { label: "Suggest a feature", action: "Email", href: SUPPORT_MAILTO, external: true },
  { label: "Talk it through, 30 minutes", action: "Book", href: BOOKING_URL, external: true },
  { label: "Send a pull request", action: "Contribute", href: "/contribute" },
  { label: "See what has shipped", action: "Changelog", href: "/changelog" },
];

const PAID_BY = [
  { icon: Gift, name: "Free", what: "No card needed" },
  { icon: Sparkles, name: "Lite and Pro", what: "Pay for the servers and AI" },
  { icon: Server, name: "Self-hosted", what: "Free, every feature" },
];

export function AboutContent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = root.current!.querySelector<HTMLElement>("[data-hero]")!;
      const mm = gsap.matchMedia();

      // Without movement, everything is simply shown where it belongs.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(hero, { autoAlpha: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The headline's words rise into place, one after another, from
        // under each line.
        gsap.set(hero, { autoAlpha: 1 });
        SplitText.create(hero.querySelector("h1"), {
          type: "words,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap
              .timeline()
              .from(self.words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.07 })
              .from(hero.querySelector("p"), { autoAlpha: 0, y: 14, duration: 0.9, ease: "power3.out" }, "-=0.6"),
        });

        // Saved items drift in from the edges toward the statement, the
        // nearer card of each pair faster than the one behind it.
        gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((pair) => {
          const dir = Number(pair.dataset.drift);
          const trigger = { trigger: "[data-collage]", start: "top bottom", end: "center center", scrub: 0.8 };
          gsap.fromTo(pair, { x: dir * 140, y: 70, rotate: dir * -5, autoAlpha: 0.2 }, { x: 0, y: 0, rotate: 0, autoAlpha: 1, ease: "none", scrollTrigger: trigger });
          gsap.fromTo(pair.querySelector("[data-front]"), { y: 60 }, { y: 0, ease: "none", scrollTrigger: trigger });
        });
        gsap.from("[data-statement] > *", {
          autoAlpha: 0,
          y: 30,
          scale: 0.96,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-statement]", start: "top 75%" },
        });

        // Each belief lights up as it reaches the middle of the screen.
        gsap.utils.toArray<HTMLElement>("[data-belief]").forEach((line) => {
          gsap.fromTo(line, { opacity: 0.18 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: line, start: "top 85%", end: "top 55%", scrub: true } });
        });

        // The picture panel opens out to full width as it arrives, and its
        // picture settles slowly behind the words.
        gsap.fromTo("[data-panel]", { scale: 0.92, borderRadius: "4rem" }, { scale: 1, borderRadius: "2.75rem", ease: "none", scrollTrigger: { trigger: "[data-panel]", start: "top bottom", end: "top 35%", scrub: true } });
        gsap.fromTo("[data-panel-image]", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: "[data-panel]", start: "top bottom", end: "bottom top", scrub: true } });
      });
    },
    { scope: root },
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1">
          {/* Hero. Hidden until GSAP has split the words, so they don't flash in place first. */}
          <noscript>
            <style>{"[data-hero]{visibility:visible!important}"}</style>
          </noscript>
          <header data-hero className="invisible flex min-h-[72svh] flex-col items-center justify-center px-5 pt-28 text-center sm:px-8">
            <h1 className="text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">
              Saving is easy.
              <br /> Finding it again isn&apos;t.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">Savedly is for the second part.</p>
          </header>

          {/* What it is */}
          <section className="px-5 py-20 sm:px-8 md:py-28">
            <motion.div
              variants={stagger(0.14)}
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: "-15% 0px" }}
              className={cn("mx-auto max-w-[34rem] space-y-8 text-center text-pretty", PROSE)}
            >
              <motion.p variants={rise} className="font-medium">
                Savedly is a memory for what you find online.
              </motion.p>
              <motion.p variants={rise} className="text-muted-foreground">
                Every link, note, screenshot and file you put in is read, summarised and filed for you. Later you describe it, or ask about it, and get it back, with the saved item there to check.
              </motion.p>
              <motion.p variants={rise} className="text-muted-foreground">
                Bookmarks ask you to organise as you go. Few of us do, and the pile wins. We think the software should do the reading, and you should only have to{" "}
                <Link href="/how-it-works" className={cn("text-foreground", UNDERLINE)}>
                  remember roughly what it was
                </Link>
                .
              </motion.p>
            </motion.div>
          </section>

          {/* What people save, around one statement */}
          <section className="overflow-x-clip px-5 py-16 sm:px-8 md:py-24">
            <div data-collage className="relative mx-auto max-w-6xl">
              <motion.div
                variants={stagger(0.1)}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "-10% 0px" }}
                className="mx-auto mb-12 grid max-w-md grid-cols-2 gap-6 lg:hidden"
              >
                <motion.div variants={rise}>
                  <Pair back="calm" front="hnsw" />
                </motion.div>
                <motion.div variants={rise}>
                  <Pair back="lisbon" front="sourdough" flip />
                </motion.div>
              </motion.div>

              <div className="hidden lg:block">
                <div data-drift="-1" className="absolute top-0 left-0 w-[18rem]">
                  <Pair back="calm" front="hnsw" />
                </div>
                <div data-drift="1" className="absolute top-0 right-0 w-[18rem]">
                  <Pair back="lisbon" front="q3" flip />
                </div>
                <div data-drift="-1" className="absolute bottom-0 left-[6%] w-[18rem]">
                  <Pair back="plaintext" front="nas" flip />
                </div>
                <div data-drift="1" className="absolute right-[6%] bottom-0 w-[18rem]">
                  <Pair back="sourdough" front="rag" />
                </div>
              </div>

              <div data-statement className="relative flex flex-col items-center text-center lg:py-56">
                <LogoMark className="h-11 w-11" ticks={false} />
                <p className="mt-7 max-w-[30rem] text-[clamp(1.75rem,3.4vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.035em] text-balance text-foreground">
                  Videos, articles, notes, plans and screenshots. It reads them all.
                </p>
              </div>

              <motion.div
                variants={stagger(0.1)}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "-10% 0px" }}
                className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-6 lg:hidden"
              >
                <motion.div variants={rise}>
                  <Pair back="plaintext" front="nas" flip />
                </motion.div>
                <motion.div variants={rise}>
                  <Pair back="q3" front="rag" />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* What it holds itself to */}
          <section className="px-5 py-24 sm:px-8 md:py-36">
            <div className={cn("mx-auto max-w-[34rem] space-y-8 text-center text-pretty", PROSE)}>
              <p data-belief>
                <span className="font-medium">What you save is yours.</span> <span className="text-muted-foreground">Export all of it, any time, on every plan.</span>
              </p>
              <p data-belief>
                <span className="font-medium">Answers come with their sources.</span> <span className="text-muted-foreground">Ask lists the saved items it used, and says so when it can&apos;t find one.</span>
              </p>
              <p data-belief>
                <span className="font-medium">Nothing changes behind your back.</span> <span className="text-muted-foreground">Ask waits for your yes before it deletes or edits.</span>
              </p>
              <p data-belief>
                <span className="font-medium">And nothing rests on trust.</span>{" "}
                <span className="text-muted-foreground">
                  The code is{" "}
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn("text-foreground", UNDERLINE)}>
                    open, under {LICENSE}
                  </a>
                  .
                </span>
              </p>
            </div>
          </section>

          {/* Ways in, on a picture */}
          <section className="px-3 sm:px-5">
            <div
              data-panel
              className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#070b14] px-5 py-20 [transform-origin:50%_0%] sm:px-8 md:rounded-[2.75rem] md:py-28"
            >
              <div data-panel-image className="absolute inset-0">
                <Image src="/landing/hero-bg-dark.jpg" alt="" fill sizes="100vw" className="object-cover opacity-90" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#070b14]/40 via-transparent to-[#1447E6]/25" />

              <div className="relative mx-auto max-w-xl text-center">
                <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.04em] text-balance text-white">
                  Built in the open.
                  <br className="hidden sm:block" /> Will you help shape it?
                </h2>
                <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
                  Savedly is new and made in Bhubaneswar. The browser extension is waiting on the Chrome Web Store; the rest is live.
                </p>

                <motion.ul
                  variants={stagger(0.06)}
                  initial="hidden"
                  whileInView="shown"
                  viewport={{ once: true, margin: "-10% 0px" }}
                  className="mx-auto mt-10 max-w-md space-y-1.5 text-left"
                >
                  {WAYS_IN.map((way) => (
                    <motion.li key={way.label} variants={rise}>
                      <motion.a
                        href={way.href}
                        {...(way.external && !way.href.startsWith("mailto:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="group flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 text-[14.5px] text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 dark:bg-white/[0.08] dark:text-white dark:ring-1 dark:ring-white/10 dark:backdrop-blur-md dark:hover:bg-white/[0.13]"
                      >
                        {way.label}
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 transition-colors group-hover:bg-neutral-900 group-hover:text-white dark:bg-white/10 dark:text-white/70 dark:group-hover:bg-white dark:group-hover:text-neutral-900">
                          {way.action}
                        </span>
                      </motion.a>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </div>
          </section>

          {/* How it pays for itself */}
          <section className="px-5 py-24 sm:px-8 md:py-32">
            <motion.div variants={stagger(0.1)} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-15% 0px" }} className="mx-auto max-w-4xl text-center">
              <motion.h2 variants={rise} className="text-[clamp(1.875rem,4vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.035em] text-balance text-foreground">
                Paid for by the people who use it
              </motion.h2>
              <motion.p variants={rise} className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                Not by advertising, and not by selling or training on what you save.
              </motion.p>

              <motion.div variants={stagger(0.1)} className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                {PAID_BY.map((plan) => (
                  <motion.div key={plan.name} variants={rise} className="group flex items-center gap-3.5 text-left">
                    <motion.span
                      whileHover={{ rotate: -8, scale: 1.06 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-foreground ring-1 ring-foreground/[0.06]"
                    >
                      <HugeiconsIcon icon={plan.icon} strokeWidth={1.75} className="h-5 w-5" />
                    </motion.span>
                    <span>
                      <span className="block text-[15px] font-medium leading-tight text-foreground">{plan.name}</span>
                      <span className="block text-[13px] text-muted-foreground">{plan.what}</span>
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={rise}>
                <Link href="/pricing" className={cn("mt-10 inline-block text-sm font-medium text-foreground", UNDERLINE)}>
                  See the plans
                </Link>
              </motion.div>
            </motion.div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
