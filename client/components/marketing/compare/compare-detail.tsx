"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "motion/react";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ComparisonTable } from "@/components/arc/blocks/comparison-table/comparison-table";
import { CompareHero } from "@/components/marketing/compare/compare-hero";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { comparisonSections, competitors, PRICES_CHECKED, savedly } from "@/lib/data/comparisons";

// /vs/<slug>: Savedly beside one tool. The opening line rises in (GSAP),
// Arc's comparison table carries the detail, and the "pick this if" lists
// and the closing links arrive with Motion. Fair to the other tool: it says
// where they're stronger, and that Savedly is new.

const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 20 }, shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.08 } } };
const H2 = "text-[clamp(1.75rem,3.6vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.035em] text-balance text-foreground";

export function CompareDetail({ slug }: { slug: string }) {
  const cta = useAuthCta();
  const them = competitors.find((c) => c.slug === slug)!;
  const others = competitors.filter((c) => c.slug !== slug).slice(0, 4);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <Navbar />

        <main className="flex-1">
          <CompareHero title={`Savedly vs ${them.name}`}>
            <p data-hero-after className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              {them.name} is a {them.type.toLowerCase()}. Savedly is an open-source place to keep anything you find online, read and filed for you, and found again by
              describing it.
            </p>
          </CompareHero>

          <section className="px-5 pb-16 sm:px-8 md:pb-24">
            <div className="mx-auto max-w-4xl">
              <ComparisonTable
                title="Side by side"
                description={`Prices as listed on each site in ${PRICES_CHECKED}.`}
                columns={[
                  { id: "savedly", name: savedly.name, caption: savedly.price, highlight: true },
                  { id: them.slug, name: them.name, caption: them.price },
                ]}
                sections={comparisonSections([them])}
                cta={{ label: cta.label, href: cta.href }}
                stickyTop={88}
              />
            </div>
          </section>

          {/* Which to pick */}
          <section className="px-5 py-16 sm:px-8 md:py-24">
            <motion.div variants={stagger} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-15% 0px" }} className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2 md:gap-16">
              {[
                { title: "Pick Savedly if", items: them.pickUsIf, strength: them.whereWeExcel, own: true },
                { title: `Pick ${them.name} if`, items: them.pickThemIf, strength: them.whereTheyExcel, own: false },
              ].map((side) => (
                <motion.div key={side.title} variants={rise}>
                  <h2 className={H2}>{side.title}</h2>
                  <ul className="mt-7 border-t border-foreground/10">
                    {side.items.map((item) => (
                      <li key={item} className="flex gap-3 border-b border-foreground/10 py-4 text-[15px] leading-relaxed text-foreground">
                        <span aria-hidden className={side.own ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30"} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{side.strength}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Honest about age, and where to go next */}
          <section className="px-5 pt-8 pb-24 sm:px-8 md:pb-32">
            <motion.div variants={stagger} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-15% 0px" }} className="mx-auto max-w-3xl text-center">
              <motion.p variants={rise} className="text-[clamp(1.5rem,3vw,2.125rem)] font-medium leading-[1.25] tracking-[-0.03em] text-balance text-foreground">
                {them.name} has been around longer. Savedly is new, and everything it has shipped is on the changelog, with the date it went out.
              </motion.p>
              <motion.div variants={rise} className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href={cta.href} className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  {cta.label}
                </Link>
                <Link href="/changelog" className="inline-flex h-11 items-center rounded-full px-6 text-[15px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5">
                  Read the changelog
                </Link>
              </motion.div>

              <motion.div variants={rise} className="mt-16 border-t border-foreground/10 pt-10">
                <p className="text-sm text-muted-foreground">Other comparisons</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {others.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/vs/${c.slug}`}
                      className="rounded-full px-4 py-2 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground hover:text-background"
                    >
                      vs {c.name}
                    </Link>
                  ))}
                  <Link href="/vs" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    All of them
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </section>
        </main>

        <MainFooter />
      </div>
    </MotionConfig>
  );
}
