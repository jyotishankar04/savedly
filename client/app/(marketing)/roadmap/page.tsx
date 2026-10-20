import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { FinalCtaSection } from "@/components/marketing/landing/final-cta-section";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal, RevealList } from "@/components/marketing/motion/reveal";
import { NextList } from "@/components/marketing/roadmap/next-list";
import { changelogEntries, changelogMonths } from "@/lib/changelog";
import { roadmapNext, roadmapNow } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Roadmap · Savedly",
  description: "What Savedly is building now, what's next, and everything shipped so far. Vote for what you'd use most, or suggest something new.",
  alternates: { canonical: "/roadmap" },
};

// The roadmap, after @shadcnstore/roadmap-1's idea of publishing order rather
// than dates: Now is the only part marked, Next is roughly in order and takes
// votes, and Shipped is the changelog grouped by month. Plans carry no dates.
// Content: lib/roadmap.ts (now and next) and lib/changelog.ts (shipped).

const H2 = "font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground";
const KIND: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/10 text-primary" },
  improved: { label: "Improved", className: "bg-muted text-foreground" },
  fixed: { label: "Fixed", className: "bg-muted text-muted-foreground" },
};
const LINK = "inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground";

export default function RoadmapPage() {
  const firstMonth = changelogMonths.at(-1)?.label;
  const stats = [
    { value: changelogEntries.length, label: firstMonth ? `updates shipped since ${firstMonth}` : "updates shipped" },
    { value: roadmapNow.length, label: roadmapNow.length === 1 ? "thing being built now" : "things being built now" },
    { value: roadmapNext.length, label: "planned next" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1">
        <HeroReveal className="px-5 pt-36 sm:px-8 md:pt-44">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-balance text-foreground">Roadmap</h1>
            <div data-hero-after className="lg:justify-self-end">
              <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                What we&apos;re building now, what&apos;s next, and everything shipped so far. Plans come in order, without dates: they can change, and your votes help decide.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/report?type=feature" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Suggest a feature
                </Link>
                <Link href="/changelog" className={LINK}>
                  Read the changelog
                </Link>
              </div>
            </div>
          </div>

          <dl data-hero-after className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-px overflow-hidden rounded-2xl bg-foreground/[0.07] ring-1 ring-foreground/[0.07] sm:grid-cols-3 md:mt-20">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-background px-6 py-6">
                <dd className="font-serif text-4xl font-medium tabular-nums tracking-[-0.02em] text-foreground">{stat.value}</dd>
                <dt className="mt-1 text-sm text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </HeroReveal>

        {/* Now: the only part marked. */}
        <section id="now" className="scroll-mt-24 px-5 pt-20 sm:px-8 md:pt-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className={H2}>Working on now</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">In the works today. It lands in the changelog when it ships.</p>
            </Reveal>
            <RevealList className="mt-10 grid gap-3" gap={0.08}>
              {roadmapNow.map((item) => (
                <article key={item.slug} className="relative overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07] sm:p-8">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                      In progress
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.area}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-medium tracking-[-0.01em] text-foreground">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>
                  {item.points && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {item.points.map((point) => (
                        <li key={point} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </RevealList>
          </div>
        </section>

        {/* Next: in order, with votes. */}
        <section id="next" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className={H2}>Coming next</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Roughly in this order. Vote for what you&apos;d use most; it moves things up.</p>
            </Reveal>
            <Reveal className="mt-10" delay={0.1}>
              <NextList items={roadmapNext} />
            </Reveal>
            <Reveal className="mt-3">
              <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-foreground/15 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="text-base font-medium text-foreground">And more</p>
                  <p className="mt-1 text-[15px] text-muted-foreground">Something you&apos;d like that isn&apos;t here? Tell us, and it may end up on this list.</p>
                </div>
                <Link href="/report?type=feature" className="inline-flex h-10 shrink-0 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  Suggest a feature
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Shipped: the changelog, by month. */}
        <section id="shipped" className="scroll-mt-24 px-3 pb-10 sm:px-5 md:pb-16">
          <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/60 px-5 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
            <div className="mx-auto max-w-6xl">
              <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <h2 className={H2}>Shipped so far</h2>
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {changelogEntries.length} updates{firstMonth ? ` since ${firstMonth}` : ""}, newest first.
                  </p>
                </div>
                <Link href="/changelog" className={cn(LINK, "self-start md:self-auto")}>
                  Every detail in the changelog
                </Link>
              </Reveal>

              <div className="mt-12 space-y-12">
                {changelogMonths.map((month) => {
                  const entries = changelogEntries.filter((entry) => entry.month === month.key);
                  return (
                    <Reveal key={month.key}>
                      <div className="grid gap-4 md:grid-cols-[10rem_1fr] md:gap-10">
                        <h3 className="text-sm font-medium text-muted-foreground md:pt-5">
                          {month.label}
                          <span className="ml-2 tabular-nums text-muted-foreground/70">{entries.length}</span>
                        </h3>
                        <ul className="divide-y divide-foreground/[0.08] rounded-2xl bg-card ring-1 ring-foreground/[0.07]">
                          {entries.map((entry) => (
                            <li key={entry.id} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4">
                              <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{entry.date}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", KIND[entry.kind]?.className)}>{KIND[entry.kind]?.label}</span>
                                  <span className="text-[15px] font-medium text-foreground">{entry.title}</span>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <FinalCtaSection />
      </main>

      <MainFooter />
    </div>
  );
}
