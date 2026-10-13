"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon as ArrowRightIcon,
  CheckIcon as CheckIcon,
  Search01Icon as SearchIcon,
} from "@hugeicons/core-free-icons";
import { SHOWCASE_MODE } from "@/lib/showcase";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { GITHUB_CONFIGURED, GITHUB_URL } from "@/lib/open-source";

// Three facts that are true, in place of the invented social proof CTA
// templates usually carry (there are no customer counts or ratings to cite).
const REASSURANCES = ["No card required", "No AI keys needed", "Open source"];

// The promise in the heading, shown working: a half-remembered question and
// the saved thing it finds. From the demo library the rest of the page uses.
const FINDS = [
  {
    ask: "how much water for bread dough",
    title: "Sourdough hydration, explained",
    from: "breadnotes.example",
    why: "Matched by meaning",
  },
  {
    ask: "when is the dentist again",
    title: "Dentist appointment on Thursday",
    from: "Note",
    why: "Thu 15 Oct, 4:30 PM",
  },
  {
    ask: "somewhere to learn pottery",
    title: "Pottery studios directory",
    from: "claydirectory.example",
    why: "Matched by meaning",
  },
  {
    ask: "what to get Priya",
    title: "Priya birthday gift ideas",
    from: "Note",
    why: "Saved 3 weeks ago",
  },
];
const FIND_MS = 3400;

/** A search box asking, and the answer under it, changing every few seconds while on screen. */
function FindPicture() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return;
    const t = setTimeout(() => setI((n) => (n + 1) % FINDS.length), FIND_MS);
    return () => clearTimeout(t);
  }, [i, reduce, inView]);
  const find = FINDS[i];

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative mx-auto w-full min-w-0 max-w-[400px] select-none lg:mx-0 lg:ml-auto"
    >
      {/* Two sheets behind, so the card reads as the top of a pile. */}
      <div className="absolute inset-x-6 -bottom-5 h-24 rounded-3xl bg-white/15" />
      <div className="absolute inset-x-3 -bottom-2.5 h-24 rounded-3xl bg-white/25" />

      <div className="relative rounded-3xl bg-white p-5 text-[#0B1B4D] shadow-2xl shadow-[#05103a]/40 sm:p-6">
        <div className="flex h-12 items-center gap-2.5 rounded-full bg-[#0B1B4D]/[0.05] px-4 ring-1 ring-[#0B1B4D]/10">
          <HugeiconsIcon
            icon={SearchIcon}
            strokeWidth={2}
            className="h-4 w-4 shrink-0 text-[#1447E6]"
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={find.ask}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="min-w-0 flex-1 truncate text-[15px]"
            >
              {find.ask}
            </motion.span>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={find.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-4 rounded-2xl bg-[#0B1B4D]/[0.04] p-4"
          >
            <p className="text-[15px] font-semibold leading-snug">
              {find.title}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-[#0B1B4D]/60">
              <span className="truncate">{find.from}</span>
              <span className="shrink-0 rounded-full bg-[#1447E6]/10 px-2 py-0.5 font-medium text-[#1447E6]">
                {find.why}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Which of the four is showing. */}
        <div className="mt-4 flex gap-1.5">
          {FINDS.map((f, n) => (
            <span
              key={f.ask}
              className={`h-1 rounded-full transition-all duration-500 ${n === i ? "w-6 bg-[#1447E6]" : "w-2 bg-[#0B1B4D]/15"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The one fully blue surface on the page. It stays on the deeper brand blue
 * (#1447E6, light theme's --primary) in dark mode too: the dark theme's
 * brighter primary only reaches ~3.6:1 against white body text.
 */
export function FinalCtaSection() {
  const cta = useAuthCta();
  const reduce = useReducedMotion();

  return (
    <section className="bg-background px-5 py-16 sm:px-6 md:py-24">
      <motion.div
        initial={{ opacity: 0, clipPath: "inset(12% 6% 12% 6% round 32px)" }}
        whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 32px)" }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={
          reduce ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
        }
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1447E6] px-7 py-16 text-white sm:px-12 sm:py-20 lg:px-16 lg:py-24"
      >
        {/* Depth: light falling in from the top right, a deeper corner at the
            bottom left, and a field of dots that fades out toward the text. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#5B8CFF]/50 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-[460px] w-[460px] rounded-full bg-[#0A2FB0]/70 blur-3xl" />
          <div
            className="absolute inset-0 text-white/25"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 1px, transparent 1.5px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(ellipse 60% 80% at 85% 45%, #000 10%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 60% 80% at 85% 45%, #000 10%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <h2 className="max-w-2xl text-4xl leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.6rem]">
              Save the next thing you don&apos;t want to lose.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">
              You don&apos;t have to remember where you saved it. Just ask
              Savedly when you need it back.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={cta.href}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#0B1B4D] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1447E6] active:translate-y-0"
              >
                {cta.isAuthenticated
                  ? cta.label
                  : SHOWCASE_MODE
                    ? "Join the waitlist"
                    : "Start saving"}
                <HugeiconsIcon
                  icon={ArrowRightIcon}
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              {GITHUB_CONFIGURED ? (
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-white ring-1 ring-white/45 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  View on GitHub
                </a>
              ) : (
                <Link
                  href="/features"
                  className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-white ring-1 ring-white/45 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  See how it works
                </Link>
              )}
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              {REASSURANCES.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={CheckIcon}
                    className="h-3.5 w-3.5"
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <FindPicture />
        </div>
      </motion.div>
    </section>
  );
}

export default FinalCtaSection;
