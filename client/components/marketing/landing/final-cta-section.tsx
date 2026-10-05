"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRightIcon, CheckIcon as CheckIcon } from "@hugeicons/core-free-icons";
import { SHOWCASE_MODE } from "@/lib/showcase";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { GITHUB_CONFIGURED, GITHUB_URL } from "@/lib/open-source";

// Three facts that are true, in place of the invented social proof CTA
// templates usually carry (there are no customer counts or ratings to cite).
const REASSURANCES = ["No card required", "No AI keys needed", "Open source"];

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
        transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#1447E6] px-7 py-16 text-white sm:px-12 sm:py-20 lg:px-16 lg:py-24"
      >
        <h2 className="max-w-3xl text-4xl leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[4rem]">
          Save the next thing you don&apos;t want to lose.
        </h2>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">
          You don&apos;t have to remember where you saved it. Just ask SaveForLatter when you need it back.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href={cta.href}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#0B1B4D] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1447E6] active:translate-y-0"
          >
            {cta.isAuthenticated ? cta.label : SHOWCASE_MODE ? "Join the waitlist" : "Start saving"}
            <HugeiconsIcon icon={ArrowRightIcon} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
              <HugeiconsIcon icon={CheckIcon} className="h-3.5 w-3.5" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

export default FinalCtaSection;
