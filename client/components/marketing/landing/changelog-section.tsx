"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { SparklesIcon as Sparkles, ZapIcon as Zap, CodeIcon as Code, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

// Structural pattern (header + prev/next arrows + a row of cards) taken
// from @shoogle/kokonutui/carousel-cards, but that block hand-rolls its own
// scrollContainer.scrollBy() scroller rather than using an actual carousel
// engine — this repo already has a real one (components/ui/carousel.tsx,
// embla-carousel-react, already a dependency), so the mechanism here is
// the project's own primitive, not a second scrolling implementation.
//
// Content is the real changelog (app/(marketing)/changelog/page.tsx's
// `updates` array), not invented — but two lines from that page are left
// out on purpose: "Fixed extensions sync lag on Chrome browser profiles"
// (v1.1.0) and "Released Chrome & Firefox browser capture extensions"
// (v1.0.0). Both claim the browser extension already shipped; the actual
// in-app page (app/(platfrom)/app/integrations/page.tsx) marks it "Coming
// soon" / "Not yet published to the Chrome Web Store," and the extension
// is Chrome MV3 only per its manifest, no Firefox key. Surfacing the
// contradiction more prominently, in a new carousel, would have made it
// worse rather than just leaving it alone on the changelog page.
interface Update {
  version: string;
  title: string;
  date: string;
  badge: string;
  icon: IconSvgElement;
  changes: string[];
}

const UPDATES: Update[] = [
  {
    version: "v1.2.0",
    title: "Semantic Search Unleashed",
    date: "August 2026",
    badge: "Major Update",
    icon: Sparkles,
    changes: [
      "Natural language semantic queries are now live for all Pro users.",
      "Optimized vector search indexing speed, reducing process queue latency by 45%.",
      "Added support for advanced search filters (type, domain, save date range).",
    ],
  },
  {
    version: "v1.1.0",
    title: "Screenshot OCR Scanning Support",
    date: "July 2026",
    badge: "Feature",
    icon: Zap,
    changes: [
      "Introduced fully automatic text extraction (OCR) for screenshots and visual mockups.",
      "Added mobile web capture sharing support.",
    ],
  },
  {
    version: "v1.0.0",
    title: "Official Public Launch",
    date: "June 2026",
    badge: "Release",
    icon: Code,
    changes: [
      "Launched initial web app dashboard.",
      "Implemented automatic categorization and folderless tags.",
    ],
  },
];

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(5px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 26, stiffness: 120 } },
};

export function ChangelogSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32 md:px-12">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={headerVariants}
        className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:mb-14"
      >
        <div className="space-y-3">
          <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Still shipping
          </span>
          <h2 className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
            What&apos;s new.
          </h2>
        </div>
        <Link
          href="/changelog"
          className="group flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          Full changelog
          <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={headerVariants}>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-4">
            {UPDATES.map((update) => (
              <CarouselItem key={update.version} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardHeader className="px-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={update.icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                      </span>
                      <Badge variant="secondary">{update.badge}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 px-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {update.version} · {update.date}
                      </p>
                      <h3 className="text-base font-semibold text-foreground">{update.title}</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {update.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* The primitive's default arrow position is -left-12/-right-12
              (48px outside the carousel) — exactly this section's own
              md:px-12 side padding, so it only just fits from md up.
              Below that (this section drops to px-6 = 24px) those arrows
              would sit off past the page's own edge with nothing to catch
              them, risking real horizontal scroll — not just a clipped
              button. Inline arrows under the cards instead, there. */}
          <div className="mt-6 flex justify-center gap-2 md:hidden">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
          </div>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </motion.div>
    </section>
  );
}

export default ChangelogSection;
