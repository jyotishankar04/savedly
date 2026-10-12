"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AiMagicIcon as UnderstandIcon,
  ArrowRight01Icon as ArrowRightIcon,
  BubbleChatIcon as AskIcon,
  CheckmarkCircle02Icon as CheckIcon,
  FileUploadIcon as FileIcon,
  FilterIcon,
  InboxDownloadIcon as CaptureIcon,
  Link01Icon as LinkIcon,
  NoteEditIcon as NoteIcon,
  QuoteUpIcon as QuoteIcon,
  Search01Icon as FindIcon,
  Tag01Icon as TagIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { cn } from "@/lib/utils";

// What happens to something after you save it, as four cards. One is open at
// a time, showing its three parts and a small picture of that step; the
// others wait as narrow columns. These are the real stages a saved item goes
// through (server/src/modules/ai/ingestion and /rag).

const EASE = [0.16, 1, 0.3, 1] as const;

interface Step {
  id: string;
  title: string;
  lead: string;
  icon: IconSvgElement;
  points: { icon: IconSvgElement; text: string }[];
  /** Tailwind classes for the two arches drawn in the closed card. */
  arch: [string, string];
  Picture: () => React.ReactNode;
}

const CHIP = "rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm ring-1 ring-foreground/[0.07]";

function CapturePicture() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["A link", "A screenshot", "A PDF", "A note", "A video"].map((label) => (
        <span key={label} className={CHIP}>
          {label}
        </span>
      ))}
      <span className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground">Save</span>
    </div>
  );
}

function UnderstandPicture() {
  return (
    <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-foreground/[0.07]">
      <p className="text-[12px] font-semibold text-foreground">Lisbon trip plan</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Land 3 May, stay in Alfama, tram 28 early, day trip to Sintra on the 5th.</p>
      <div className="mt-2 flex gap-1.5">
        {["travel", "lisbon", "itinerary"].map((tag) => (
          <span key={tag} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function FindPicture() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-primary/40">
        <HugeiconsIcon icon={FindIcon} strokeWidth={2} className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] text-foreground">that trip with the tram</span>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/[0.07]">
        <span className="truncate text-[11px] font-semibold text-foreground">Lisbon trip plan</span>
        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Matched by meaning</span>
      </div>
    </div>
  );
}

function AskPicture() {
  return (
    <div className="space-y-2">
      <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-3 py-1.5 text-[11px] text-primary-foreground">When do I land in Lisbon?</p>
      <div className="w-fit max-w-[90%] rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/[0.07]">
        <p className="text-[11px] leading-relaxed text-foreground">
          On <span className="font-semibold">3 May</span>, from your Lisbon trip plan.
        </p>
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    id: "capture",
    title: "Capture",
    lead: "Save it the moment you find it, in whatever form it's in.",
    icon: CaptureIcon,
    points: [
      { icon: LinkIcon, text: "Paste a link" },
      { icon: FileIcon, text: "Drop a file, PDF or screenshot" },
      { icon: NoteIcon, text: "Type a note" },
    ],
    arch: ["from-sky-200 to-blue-300 dark:from-sky-400/40 dark:to-blue-500/40", "from-blue-200 to-indigo-200 dark:from-blue-400/30 dark:to-indigo-400/30"],
    Picture: CapturePicture,
  },
  {
    id: "understand",
    title: "Understand",
    lead: "Savedly reads what you saved, so you don't have to describe it.",
    icon: UnderstandIcon,
    points: [
      { icon: TextIcon, text: "Reads the page, the PDF, the text in an image" },
      { icon: QuoteIcon, text: "Writes a short summary" },
      { icon: TagIcon, text: "Adds tags and files it in a collection" },
    ],
    arch: ["from-violet-200 to-indigo-300 dark:from-violet-400/40 dark:to-indigo-500/40", "from-fuchsia-100 to-violet-200 dark:from-fuchsia-400/25 dark:to-violet-400/30"],
    Picture: UnderstandPicture,
  },
  {
    id: "find",
    title: "Find",
    lead: "Search the way you remember things: roughly.",
    icon: FindIcon,
    points: [
      { icon: FindIcon, text: "By the exact words" },
      { icon: UnderstandIcon, text: "By the meaning, when you forgot the words" },
      { icon: FilterIcon, text: "Narrowed by type, tag or collection" },
    ],
    arch: ["from-cyan-200 to-sky-300 dark:from-cyan-400/40 dark:to-sky-500/40", "from-teal-100 to-cyan-200 dark:from-teal-400/25 dark:to-cyan-400/30"],
    Picture: FindPicture,
  },
  {
    id: "ask",
    title: "Ask",
    lead: "Or skip the search and ask a question.",
    icon: AskIcon,
    points: [
      { icon: AskIcon, text: "Answers in plain words" },
      { icon: QuoteIcon, text: "Lists the memories each answer came from" },
      { icon: CheckIcon, text: "Asks before it changes or deletes anything" },
    ],
    arch: ["from-indigo-200 to-blue-300 dark:from-indigo-400/40 dark:to-blue-500/40", "from-blue-100 to-sky-200 dark:from-blue-400/25 dark:to-sky-400/30"],
    Picture: AskPicture,
  },
];

export function StepsSection() {
  const cta = useAuthCta();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-background px-3 py-10 font-sans antialiased sm:px-5 md:py-16">
      {/* The whole section sits on one soft, rounded backdrop, with the cards white on top of it. */}
      <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/60 px-4 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">How it works</p>
        <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.035em] text-balance text-foreground">
          For people who save more than they can remember
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Saving is the easy part. Finding it again is where it goes wrong. Savedly does the work in between.
        </p>
        <Link
          href={cta.href}
          className="group mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {cta.isAuthenticated ? cta.label : "Start saving free"}
          <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-3 lg:h-[480px] lg:flex-row">
        {STEPS.map((step, i) => {
          const isOpen = i === open;
          const Picture = step.Picture;
          return (
            <div
              key={step.id}
              onMouseEnter={() => setOpen(i)}
              className={cn(
                "relative overflow-hidden rounded-3xl ring-1 transition-[flex-grow,background-color,box-shadow] duration-500 ease-out lg:min-w-0 lg:basis-0",
                isOpen ? "bg-card shadow-xl shadow-primary/[0.08] ring-foreground/[0.06] lg:grow-[2.4]" : "bg-card ring-foreground/[0.04] lg:grow",
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`step-${step.id}`}
                onClick={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                className="flex w-full items-start gap-3 p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 lg:p-7"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-500",
                    isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <HugeiconsIcon icon={step.icon} strokeWidth={2} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-medium tracking-[-0.02em] text-foreground">{step.title}</span>
                  <span className={cn("mt-1 block text-sm leading-relaxed text-muted-foreground", !isOpen && "lg:line-clamp-3")}>{step.lead}</span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`step-${step.id}`}
                    key="body"
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="overflow-hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:top-[7.25rem] lg:!h-auto"
                  >
                    <div className="flex h-full flex-col px-6 pb-6 lg:px-7 lg:pb-7">
                      <ul className="space-y-2.5">
                        {step.points.map((point) => (
                          <li key={point.text} className="flex items-center gap-2.5 text-sm text-foreground">
                            <HugeiconsIcon icon={point.icon} strokeWidth={2} className="h-4 w-4 shrink-0 text-primary" />
                            {point.text}
                          </li>
                        ))}
                      </ul>
                      <div className={cn("mt-6 rounded-2xl bg-gradient-to-br p-4 lg:mt-auto", step.arch[0])}>
                        <Picture />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The closed card's decoration: two arches rising from its foot. Wide screens only. */}
              <div
                aria-hidden
                className={cn("pointer-events-none absolute inset-x-0 bottom-0 hidden h-[46%] items-end gap-0 transition-opacity duration-500 lg:flex", isOpen ? "opacity-0" : "opacity-100")}
              >
                <div className={cn("h-[70%] flex-1 rounded-t-full bg-gradient-to-b", step.arch[1])} />
                <div className={cn("h-full flex-1 rounded-t-full bg-gradient-to-b", step.arch[0])} />
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}
