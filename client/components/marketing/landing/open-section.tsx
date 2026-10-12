"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRightIcon, Copy01Icon as CopyIcon, Tick02Icon as TickIcon } from "@hugeicons/core-free-icons";
import { GithubStarButton, useStarCount } from "@/components/marketing/github-star-button";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { INSTALL_COMMAND, LICENSE } from "@/lib/open-source";
import { cn } from "@/lib/utils";

// How to start, two ways: on the hosted service, or running your own copy.
// Each is three steps beside a picture that changes with the step. The
// pictures are the Help Center's own screenshots (public/help/docs), so this
// section shows exactly what a new person will see.

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP_MS = 4500;

interface Step {
  text: string;
  image: string;
  alt: string;
  /** Show the install command on a card over the picture. */
  install?: boolean;
}

interface Way {
  id: "hosted" | "self-hosted";
  tab: string;
  steps: Step[];
}

const WAYS: Way[] = [
  {
    id: "hosted",
    tab: "Hosted by us",
    steps: [
      { text: "Create an account with Google, GitHub or your email", image: "getting-started-1", alt: "The sign-up page, with Google and GitHub sign-in." },
      { text: "Save your first link, file or note", image: "capture-1", alt: "The Quick Capture page with a link pasted in." },
      { text: "Search for it, or ask about it, whenever you need it", image: "ask-2", alt: "Ask answering a question, with the memories it used." },
    ],
  },
  {
    id: "self-hosted",
    tab: "Self-hosted",
    steps: [
      { text: "Run one command on any machine with Docker", image: "getting-started-3", alt: "The Savedly dashboard.", install: true },
      { text: "Open it in your browser and create your admin account", image: "getting-started-1", alt: "The sign-up page." },
      { text: "Add your own AI key in the admin area, and every feature is yours", image: "self-host", alt: "The admin Infrastructure page, where services are configured." },
    ],
  },
];

function InstallCard() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // No clipboard access (an old browser, or an insecure page): the command is on screen to select by hand.
    }
  }
  return (
    <div className="w-full max-w-[420px] rounded-3xl bg-card p-6 shadow-2xl shadow-black/15 ring-1 ring-foreground/[0.07] sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Install</p>
      <p className="mt-3 break-all font-mono text-[12.5px] leading-relaxed text-muted-foreground select-all">
        <span className="text-primary">$</span> {INSTALL_COMMAND}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <HugeiconsIcon icon={copied ? TickIcon : CopyIcon} strokeWidth={2} className="h-[18px] w-[18px]" />
        <span aria-live="polite">{copied ? "Copied" : "Copy command"}</span>
      </button>
    </div>
  );
}

export function OpenSection() {
  const cta = useAuthCta();
  const stars = useStarCount();
  const reduce = useReducedMotion();
  const [wayIndex, setWayIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  // The steps take turns until someone picks one (or the copy card is on screen to be used).
  const [touched, setTouched] = useState(false);

  const way = WAYS[wayIndex];
  const step = way.steps[stepIndex];

  // Only while the section is on screen, so a visitor arrives at step 1.
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section, { amount: 0.35 });

  useEffect(() => {
    if (reduce || touched || !inView) return;
    const t = setTimeout(() => setStepIndex((i) => (i + 1) % way.steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [stepIndex, way, reduce, touched, inView]);

  function chooseWay(index: number) {
    setWayIndex(index);
    setStepIndex(0);
    setTouched(false);
  }

  const hosted = way.id === "hosted";

  return (
    <section ref={section} id="open-source" className="scroll-mt-24 bg-background px-5 font-sans antialiased sm:px-8">
      <div className="mx-auto max-w-6xl border-y border-foreground/15 py-20 md:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">Up and running in minutes</h2>

          <div role="tablist" aria-label="Where Savedly runs" className="flex w-fit shrink-0 gap-1 rounded-2xl bg-muted p-1">
            {WAYS.map((w, i) => {
              const selected = i === wayIndex;
              return (
                <button
                  key={w.id}
                  role="tab"
                  type="button"
                  id={`start-tab-${w.id}`}
                  aria-selected={selected}
                  aria-controls="start-panel"
                  onClick={() => chooseWay(i)}
                  className={cn(
                    "relative rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="start-tab-pill"
                      className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-foreground/[0.06]"
                      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.5, bounce: 0.18 }}
                    />
                  )}
                  <span className="relative">{w.tab}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div id="start-panel" role="tabpanel" aria-labelledby={`start-tab-${way.id}`} className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-10">
          <div className="flex flex-col">
            <ol>
              {way.steps.map((s, i) => {
                const current = i === stepIndex;
                return (
                  <li key={`${way.id}-${i}`} className="border-b border-foreground/15 last:border-b-0">
                    <button
                      type="button"
                      aria-current={current ? "step" : undefined}
                      onClick={() => {
                        setTouched(true);
                        setStepIndex(i);
                      }}
                      className={cn(
                        "block w-full py-6 text-left transition-opacity duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        i === 0 && "pt-0",
                        current ? "opacity-100" : "opacity-40 hover:opacity-70",
                      )}
                    >
                      <span className="block font-serif text-4xl font-medium leading-none tracking-[-0.02em] text-foreground">{i + 1}.</span>
                      <span className="mt-2.5 block max-w-[19rem] text-[15px] leading-relaxed text-foreground">{s.text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={hosted ? cta.href : "/help/docs/self-host/self-host"}
                  className="group inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {hosted ? (cta.isAuthenticated ? cta.label : "Start saving free") : "Read the guide"}
                  <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {!hosted && <GithubStarButton variant="hero" label="Star on GitHub" />}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {hosted
                  ? "A free plan to start with. We run it and supply the AI."
                  : `${LICENSE} licensed. Free to self-host, with every feature${stars ? `. ${stars.toLocaleString()} ${stars === 1 ? "star" : "stars"} on GitHub` : ""}.`}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-muted/70 sm:rounded-[2.5rem]">
            {/* The Help Center's screenshot for this step, whole, framed in the panel. */}
            <div className="relative mx-[6%] my-[7%] aspect-[1280/800] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-foreground/[0.07]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${way.id}-${stepIndex}`}
                  className="absolute inset-0"
                  initial={reduce ? false : { opacity: 0, x: 28, scale: 1.01 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <Image src={`/help/docs/${step.image}.png`} alt={step.alt} fill sizes="(min-width: 1024px) 800px, 100vw" className="object-cover object-left-top" />
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
              {step.install && (
                <motion.div
                  key="install"
                  className="absolute inset-x-4 bottom-4 flex justify-end sm:inset-x-auto sm:bottom-8 sm:right-8"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  // Using the card means reading it: stop the steps moving on.
                  onPointerDown={() => setTouched(true)}
                  onFocusCapture={() => setTouched(true)}
                >
                  <InstallCard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
