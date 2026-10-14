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
import { ArrowUpRight01Icon as ArrowUpRight } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { DISCORD_URL, GITHUB_URL } from "@/lib/open-source";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// The community page, in the About, Contact and Contribute pages' manner:
// one font, a headline that rises in (GSAP), the Discord on the dark picture
// panel, the other places as rows (Motion), and the code of conduct as one
// sentence that lights up word by word as you scroll (GSAP). Only places
// that exist are listed: no X account or showcase, and no member counts.

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;
const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

const IN_DISCORD = [
  "Ask how to do something, on the hosted app or your own install.",
  "Show how you use Savedly, and pick up ideas from others.",
  "Talk an idea through in #contributing before you build it.",
];

const ELSEWHERE: { label: string; detail: string; action: string; href: string; external?: boolean }[] = [
  { label: "GitHub Discussions", detail: "Longer questions and ideas, in public, where the next person can find them", action: "Discuss", href: `${GITHUB_URL}/discussions`, external: true },
  { label: "GitHub Issues", detail: "Bugs, and feature requests concrete enough to build", action: "Issues", href: `${GITHUB_URL}/issues`, external: true },
  { label: "Product Hunt", detail: "Follow Savedly there, or leave a review", action: "Follow", href: "https://www.producthunt.com/products/savedly", external: true },
  { label: "The changelog", detail: "What shipped, and when", action: "Read", href: "/changelog" },
  { label: "The blog", detail: "Longer write-ups about how it works and why", action: "Read", href: "/blog" },
];

const CONDUCT = "Be kind, be patient with people who are new, disagree with ideas rather than people, and keep each other's details private.";

export function CommunityContent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = root.current!.querySelector<HTMLElement>("[data-hero]")!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(hero, { autoAlpha: 1 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(hero, { autoAlpha: 1 });
        SplitText.create(hero.querySelector("h1"), {
          type: "words,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap
              .timeline()
              .from(self.words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08 })
              .from(hero.querySelectorAll("[data-hero-after]"), { autoAlpha: 0, y: 14, duration: 0.9, ease: "power3.out", stagger: 0.1 }, "-=0.6"),
        });

        // The Discord panel opens out as it arrives, its picture settles,
        // and its three lines come in one after another.
        gsap.fromTo("[data-panel]", { scale: 0.92, borderRadius: "4rem" }, { scale: 1, borderRadius: "2.75rem", ease: "none", scrollTrigger: { trigger: "[data-panel]", start: "top bottom", end: "top 35%", scrub: true } });
        gsap.fromTo("[data-panel-image]", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: "[data-panel]", start: "top bottom", end: "bottom top", scrub: true } });
        gsap.from("[data-discord-line]", { autoAlpha: 0, x: -24, duration: 0.8, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: "[data-discord-lines]", start: "top 80%" } });

        // The code of conduct lights up word by word as you read down to it.
        SplitText.create("[data-conduct]", {
          type: "words",
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(self.words, { opacity: 0.15 }, { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: "[data-conduct]", start: "top 80%", end: "bottom 45%", scrub: true } }),
        });
      });
    },
    { scope: root },
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1">
          <noscript>
            <style>{"[data-hero]{visibility:visible!important}"}</style>
          </noscript>
          <header data-hero className="invisible flex min-h-[64svh] flex-col items-center justify-center px-5 pt-32 pb-10 text-center sm:px-8">
            <h1 className="text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">Join the community</h1>
            <p data-hero-after className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              Ask questions, share how you use Savedly, and help decide what it does next. It&apos;s new and small, so what you say gets heard.
            </p>
            <div data-hero-after className="mt-9">
              <a
                href={DISCORD_URL}
                {...EXTERNAL}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Join the Discord
                <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-4 w-4" />
              </a>
            </div>
          </header>

          {/* The Discord */}
          <section className="px-3 py-10 sm:px-5 md:py-16">
            <div data-panel className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#070b14] px-5 py-16 [transform-origin:50%_0%] sm:px-8 md:rounded-[2.75rem] md:py-28">
              <div data-panel-image className="absolute inset-0">
                <Image src="/landing/hero-bg-dark.jpg" alt="" fill sizes="100vw" className="object-cover opacity-90" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#070b14]/40 via-transparent to-[#1447E6]/25" />

              <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
                <div>
                  <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[1.04] tracking-[-0.04em] text-balance text-white">The Discord is where it happens</h2>
                  <a
                    href={DISCORD_URL}
                    {...EXTERNAL}
                    className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Join the Discord
                    <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-4 w-4" />
                  </a>
                </div>
                <ul data-discord-lines className="space-y-3">
                  {IN_DISCORD.map((line) => (
                    <li
                      key={line}
                      data-discord-line
                      className="rounded-2xl bg-white/[0.07] px-5 py-4 text-[15px] leading-relaxed text-white/85 ring-1 ring-white/10 backdrop-blur-md"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Everywhere else */}
          <section className="px-5 py-20 sm:px-8 md:py-28">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-[clamp(1.875rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.035em] text-balance text-foreground">And everywhere else</h2>

              <motion.ul
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "-10% 0px" }}
                className="mt-10 divide-y divide-foreground/10 border-y border-foreground/10"
              >
                {ELSEWHERE.map((place) => {
                  const inner = (
                    <>
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-foreground">{place.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{place.detail}</span>
                      </span>
                      <span className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors group-hover:bg-foreground group-hover:text-background">
                        {place.action}
                      </span>
                    </>
                  );
                  return (
                    <motion.li key={place.label} variants={rise} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                      {place.external ? (
                        <a href={place.href} {...EXTERNAL} className="group flex items-center justify-between gap-6 py-5">
                          {inner}
                        </a>
                      ) : (
                        <Link href={place.href} className="group flex items-center justify-between gap-6 py-5">
                          {inner}
                        </Link>
                      )}
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          </section>

          {/* How we treat each other */}
          <section className="px-5 pt-10 pb-28 sm:px-8 md:pb-40">
            <div className="mx-auto max-w-3xl text-center">
              <p data-conduct className="text-[clamp(1.75rem,3.6vw,2.625rem)] font-medium leading-[1.2] tracking-[-0.03em] text-balance text-foreground">
                {CONDUCT}
              </p>
              <p className="mt-8 text-sm text-muted-foreground">
                The{" "}
                <a
                  href={`${GITHUB_URL}/blob/main/CODE_OF_CONDUCT.md`}
                  {...EXTERNAL}
                  className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  code of conduct
                </a>{" "}
                applies in the Discord, on GitHub, and anywhere else Savedly gathers.
              </p>
            </div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
