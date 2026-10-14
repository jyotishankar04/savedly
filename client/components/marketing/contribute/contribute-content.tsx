"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon as ArrowUpRight, Coffee01Icon as Coffee } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { DISCORD_URL, GITHUB_URL, LICENSE } from "@/lib/open-source";
import { BMC_QR_IMAGE, BMC_URL } from "@/lib/support";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// The contribute page, in the About and Contact pages' manner: one large
// line that rises in, then the ways to help, how to run it locally (Arc's
// segmented control switches between the three apps), the path to a first
// pull request with a line that fills as you read down it, and the donation
// panel. Everything here is from CONTRIBUTING.md and docs/GETTING_STARTED.md;
// if those change, change this.

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;
const H2 = "text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance text-foreground";
const LINK = "font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground";

const WAYS: { title: string; body: string; link: string; href: string }[] = [
  { title: "Report a bug", body: "Say what you did, what you expected, and what happened instead. Steps to repeat it are worth more than anything else.", link: "Open an issue", href: `${GITHUB_URL}/issues/new` },
  { title: "Suggest a feature", body: "Describe the problem it solves, not only the feature. It's easier to agree on the problem first.", link: "Start the conversation", href: `${GITHUB_URL}/issues/new` },
  { title: "Fix something", body: "Pick an issue marked good first issue, or fix a thing that has been bugging you. Small changes are welcome.", link: "Good first issues", href: `${GITHUB_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22` },
  { title: "Improve the docs", body: "The README, the guides and the Help Center. A clearer sentence helps as many people as a fix does.", link: "Read the docs", href: `${GITHUB_URL}/tree/main/docs` },
];

const APPS: { value: string; label: string; what: string; commands: string[]; note: string }[] = [
  {
    value: "server",
    label: "API",
    what: "Express and TypeScript, with Postgres, Redis and Mailhog in Docker.",
    commands: ["cd server", "docker compose up -d db redis mailhog", "pnpm install", "cp .env.example .env", "pnpm db:bootstrap", "pnpm dev"],
    note: "Before pnpm db:bootstrap, fill in the five secrets in .env. Each one has the command that makes it beside it.",
  },
  {
    value: "client",
    label: "Website",
    what: "Next.js, the dashboard and these pages.",
    commands: ["cd client", "pnpm install", "pnpm dev"],
    note: "Open localhost:3000 and sign up with an email and password. The first account on a new database is an admin.",
  },
  {
    value: "extension",
    label: "Extension",
    what: "The Chrome extension, built against your local API.",
    commands: ["cd extension", "pnpm install", "pnpm build:local"],
    note: "Then open chrome://extensions, turn on Developer mode, and load the dist folder with Load unpacked.",
  },
];

const STEPS: { title: string; body: string; code?: string[] }[] = [
  { title: "Fork it, and branch off main", body: "Never off prod-web or prod-server. Those only take release pull requests from main." },
  { title: "Keep the change focused", body: "A bug fix doesn't need an unrelated tidy-up riding along with it." },
  { title: "Run the checks CI runs", body: "The same ones that run on every pull request.", code: ["cd server && pnpm typecheck", "cd client && pnpm lint && pnpm build"] },
  { title: "Say why in the commit", body: "What changed is in the diff. The reason isn't, unless you write it down." },
  { title: "Open a pull request against main", body: "Describe what changed, why, and how you tested it. There's no test suite yet, so how you tried it matters." },
];

function Terminal({ lines }: { lines: string[] }) {
  return (
    <div className="relative rounded-2xl bg-muted/70 p-5 ring-1 ring-foreground/[0.07] sm:p-6">
      <div className="absolute top-3 right-3">
        <CopyButton value={lines.join("\n")} label="Copy commands" iconOnly variant="plain" />
      </div>
      <pre className="overflow-x-auto pr-10 font-mono text-[13px] leading-[1.9] text-foreground">
        {lines.map((line) => (
          <div key={line}>
            <span className="select-none text-muted-foreground">$ </span>
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
}

function RunLocally() {
  const [app, setApp] = useState(APPS[0].value);
  const reduced = useReducedMotion();
  const current = APPS.find((a) => a.value === app)!;
  return (
    <div>
      <SegmentedControl label="Which app" options={APPS.map(({ value, label }) => ({ value, label }))} value={app} onValueChange={setApp} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={app}
          initial={reduced ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduced ? undefined : { opacity: 0, y: -6, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          <p className="text-[15px] text-muted-foreground">{current.what}</p>
          <div className="mt-4">
            <Terminal lines={current.commands} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{current.note}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ContributeContent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const hero = root.current!.querySelector<HTMLElement>("[data-hero]")!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(hero, { autoAlpha: 1 });
        gsap.set("[data-steps-fill]", { scaleY: 1 });
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

        // The four ways in arrive one after another as the grid comes up.
        ScrollTrigger.batch("[data-way]", {
          start: "top 88%",
          once: true,
          onEnter: (batch) => gsap.from(batch, { autoAlpha: 0, y: 40, duration: 0.9, ease: "power3.out", stagger: 0.1, overwrite: true }),
        });

        // A line fills down the steps as you read them, and each number
        // turns blue as the line reaches it.
        gsap.fromTo("[data-steps-fill]", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-steps]", start: "top 65%", end: "bottom 65%", scrub: 0.4 } });
        gsap.utils.toArray<HTMLElement>("[data-step-dot]").forEach((dot) => {
          ScrollTrigger.create({ trigger: dot, start: "top 65%", onEnter: () => dot.classList.add("is-reached"), onLeaveBack: () => dot.classList.remove("is-reached") });
        });

        // The donation panel opens out as it arrives; its picture settles behind it.
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
          <noscript>
            <style>{"[data-hero]{visibility:visible!important}"}</style>
          </noscript>
          <header data-hero className="invisible flex min-h-[64svh] flex-col items-center justify-center px-5 pt-32 pb-10 text-center sm:px-8">
            <h1 className="text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">Build it with us</h1>
            <p data-hero-after className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              Savedly is open source under {LICENSE}. A bug report, a fix, a clearer guide or a coffee all move it forward.
            </p>
            <div data-hero-after className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={GITHUB_URL}
                {...EXTERNAL}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View on GitHub
                <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-4 w-4" />
              </a>
              <a
                href={DISCORD_URL}
                {...EXTERNAL}
                className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-[15px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5"
              >
                Join the Discord
              </a>
            </div>
          </header>

          {/* Ways to help */}
          <section className="px-5 py-20 sm:px-8 md:py-28">
            <div className="mx-auto max-w-6xl">
              <h2 className={H2}>Four ways in</h2>
              <div className="mt-12 grid gap-x-12 border-t border-foreground/10 md:grid-cols-2">
                {WAYS.map((way, i) => (
                  <div key={way.title} data-way className="border-b border-foreground/10 py-8">
                    <span className="text-sm text-muted-foreground tabular-nums">0{i + 1}</span>
                    <h3 className="mt-3 text-xl font-medium tracking-[-0.02em] text-foreground">{way.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{way.body}</p>
                    <a href={way.href} {...EXTERNAL} className={cn("mt-4 inline-flex items-center gap-1 text-sm", LINK)}>
                      {way.link}
                      <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Run it locally */}
          <section className="px-3 py-10 sm:px-5 md:py-16">
            <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/50 px-5 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20 [&>*]:min-w-0">
                <div className="max-w-md">
                  <h2 className={H2}>Run it on your machine</h2>
                  <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
                    You need Node.js, pnpm and Docker. No cloud account and no OAuth app: sign-in works with an email and password locally.
                  </p>
                  <a href={`${GITHUB_URL}/blob/main/docs/GETTING_STARTED.md`} {...EXTERNAL} className={cn("mt-7 inline-block text-sm", LINK)}>
                    The full setup guide
                  </a>
                </div>
                <RunLocally />
              </div>
            </div>
          </section>

          {/* Your first pull request */}
          <section className="px-5 py-20 sm:px-8 md:py-28">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20 [&>*]:min-w-0">
              <div className="max-w-md lg:sticky lg:top-32 lg:self-start">
                <h2 className={H2}>Your first pull request</h2>
                <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
                  For a small fix, just open it. For anything larger (a new feature, a new dependency, or a change to the database, sign-in or the AI providers),
                  open an issue first, so the approach is agreed before you spend the time.
                </p>
                <p className="mt-6 text-sm text-muted-foreground">
                  Read{" "}
                  <a href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`} {...EXTERNAL} className={LINK}>
                    CONTRIBUTING.md
                  </a>{" "}
                  and the{" "}
                  <a href={`${GITHUB_URL}/blob/main/CODE_OF_CONDUCT.md`} {...EXTERNAL} className={LINK}>
                    code of conduct
                  </a>
                  . Contributions are licensed under {LICENSE}, like the rest.
                </p>
              </div>

              <ol data-steps className="relative">
                <span aria-hidden className="absolute top-3 bottom-3 left-[15px] w-px bg-foreground/10" />
                <span aria-hidden data-steps-fill className="absolute top-3 bottom-3 left-[15px] w-px origin-top scale-y-0 bg-primary" />
                {STEPS.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5 pb-10 last:pb-0">
                    <span
                      data-step-dot
                      className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background text-sm text-muted-foreground tabular-nums ring-1 ring-foreground/15 transition-colors duration-300 [&.is-reached]:bg-primary [&.is-reached]:text-primary-foreground [&.is-reached]:ring-primary"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-1">
                      <h3 className="text-lg font-medium tracking-[-0.015em] text-foreground">{step.title}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                      {step.code && (
                        <div className="mt-4">
                          <Terminal lines={step.code} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Or keep the servers running */}
          <section className="px-3 pb-20 sm:px-5 md:pb-28">
            <div data-panel className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#070b14] px-5 py-16 [transform-origin:50%_0%] sm:px-8 md:rounded-[2.75rem] md:py-24">
              <div data-panel-image className="absolute inset-0">
                <Image src="/landing/hero-bg-dark.jpg" alt="" fill sizes="100vw" className="object-cover opacity-90" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#070b14]/40 via-transparent to-[#1447E6]/25" />

              <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <h2 className="text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance text-white">Or keep the servers running</h2>
                  <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
                    The database, storage, email and the AI on the hosted plans cost money every month. If Savedly helps you, a small contribution helps keep the Free plan free.
                  </p>
                  <motion.a
                    href={BMC_URL}
                    {...EXTERNAL}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                    className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[#FFDD00] px-6 text-[15px] font-medium text-black"
                  >
                    <HugeiconsIcon icon={Coffee} strokeWidth={2} className="h-4 w-4" />
                    Buy me a coffee
                  </motion.a>
                  <p className="mt-3 text-sm text-white/55">Opens Buy Me a Coffee in a new tab.</p>
                </div>

                <motion.a
                  href={BMC_URL}
                  {...EXTERNAL}
                  initial={{ opacity: 0, y: 24, rotate: -2 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="mx-auto flex w-full max-w-[220px] flex-col items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl shadow-black/40 lg:justify-self-end"
                >
                  <Image src={BMC_QR_IMAGE} alt="QR code for Savedly's Buy Me a Coffee page" width={188} height={188} className="h-auto w-full" />
                  <span className="text-center text-xs font-medium text-neutral-600">Scan to support from your phone</span>
                </motion.a>
              </div>
            </div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
