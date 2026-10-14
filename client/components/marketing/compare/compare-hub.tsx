"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ComparisonTable } from "@/components/arc/blocks/comparison-table/comparison-table";
import { CompareHero } from "@/components/marketing/compare/compare-hero";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { comparisonSections, competitors, PRICES_CHECKED, savedly } from "@/lib/data/comparisons";

// /vs: every comparison as a row (Motion), and Savedly beside three
// different kinds of tool in Arc's comparison table, a mind tool, a
// bookmark manager and a workspace, so the overview shows the range.

const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };
const OVERVIEW = ["mymind", "raindrop", "notion"];

export function CompareHub() {
  const cta = useAuthCta();
  const overview = competitors.filter((c) => OVERVIEW.includes(c.slug));

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1">
          <CompareHero title="Savedly, compared">
            <p data-hero-after className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              Side by side with the tools people use to keep things. Where another one is the better fit, each page says so.
            </p>
          </CompareHero>

          <section className="px-5 pb-16 sm:px-8 md:pb-24">
            <div className="mx-auto max-w-5xl">
              <ComparisonTable
                title="At a glance"
                description="Savedly beside a visual memory tool, a bookmark manager and a workspace. Pick any tool below for the full comparison."
                columns={[{ id: "savedly", name: savedly.name, caption: savedly.price, highlight: true }, ...overview.map((c) => ({ id: c.slug, name: c.name, caption: c.price }))]}
                sections={comparisonSections(overview)}
                cta={{ label: cta.label, href: cta.href }}
                stickyTop={88}
              />
            </div>
          </section>

          <section className="px-5 pb-24 sm:px-8 md:pb-32">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-[clamp(1.875rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.035em] text-balance text-foreground">Every comparison</h2>
              <motion.ul
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "-10% 0px" }}
                className="mt-10 divide-y divide-foreground/10 border-y border-foreground/10"
              >
                {competitors.map((c) => (
                  <motion.li key={c.slug} variants={rise} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                    <Link href={`/vs/${c.slug}`} className="group flex items-center justify-between gap-6 py-5">
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-foreground">Savedly vs {c.name}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {c.type} · {c.price}
                        </span>
                      </span>
                      <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Prices and features as listed on each tool&apos;s own site in {PRICES_CHECKED}. Spotted something out of date?{" "}
                <Link href="/contact" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                  Tell us
                </Link>
                .
              </p>
            </div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
