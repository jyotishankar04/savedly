"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  SparklesIcon as Sparkles,
  Search01Icon as Search,
  NetworkIcon as Network,
  LockPasswordIcon as Lock,
  GlobeIcon as Globe,
  Calendar01Icon as Calendar,
  RouteIcon as Route,
  Layers01Icon as Layers,
  ZapIcon as Zap,
} from "@hugeicons/core-free-icons";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Structure adapted from @shoogle/7ovr/bento-1 ("Icon Bento With Hero
// Tile") — its 6-tile version (one md:col-span-2/row-span-2 hero + 5
// singles) is extended to 9 here (hero + 8) so a 4-column grid tiles
// perfectly with no leftover gap: the hero occupies a 2x2 block, leaving
// exactly 8 single cells to fill the rest of a 4x3 grid, all through plain
// grid auto-flow — no manual row/col placement on the 8 singles at all.
// IconPlaceholder (the reference's multi-icon-library abstraction) is
// swapped for this repo's own HugeiconsIcon; `font-heading` (a token this
// project doesn't define) is dropped.
interface Tile {
  icon: IconSvgElement;
  title: string;
  description: string;
  href: string;
  hero?: boolean;
}

const TILES: Tile[] = [
  {
    hero: true,
    icon: Sparkles,
    title: "Ask, with receipts",
    description: "Every answer points back to the memory it came from — ask in plain English, get something you can actually check.",
    href: "#ask",
  },
  { icon: Search, title: "Search both ways", description: "The exact word, or just the gist — both get searched and ranked together.", href: "#search" },
  { icon: Network, title: "A library with a shape", description: "Related by meaning, by tag, or by collection — nothing you save sits alone.", href: "#graph" },
  { icon: Lock, title: "A real lock, not a toggle", description: "PIN-protected. Blurs when you look away, locks for real when you switch tabs.", href: "#vault" },
  { icon: Globe, title: "Wherever you already are", description: "The dashboard today — the browser extension is on the way.", href: "#everywhere" },
  { icon: Calendar, title: "Plays well with your calendar", description: "Push a detected event straight to Google Calendar or Outlook.", href: "#integrations" },
  { icon: Route, title: "One pipeline, every save", description: "Read, summarized, tagged, and embedded — the same four steps, every time.", href: "#how-it-works" },
  { icon: Layers, title: "Whatever it is, it goes in", description: "Links, videos, notes, images, documents, voice — all one box.", href: "#formats" },
  { icon: Zap, title: "Always shipping", description: "New capability most months — see what actually changed.", href: "/changelog" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(5px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 26, stiffness: 120 },
  },
};

export function FeatureOverviewBento() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-28 md:px-12">
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">The whole picture</span>
        <h2 className="mt-3 text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Everything below, at a glance.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Tap a tile to jump straight to it, or keep scrolling for the full picture.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-[auto_auto]"
      >
        {TILES.map((tile) => (
          <motion.div key={tile.title} variants={cardVariants} className={tile.hero ? "md:col-span-2 md:row-span-2" : undefined}>
            <Link href={tile.href} className="block h-full">
              <Card className="group h-full justify-between p-6 transition-colors hover:border-primary/30 hover:bg-muted/40">
                <CardHeader className="p-0">
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-lg border border-border bg-muted text-primary",
                      tile.hero ? "size-10 md:size-14" : "size-10"
                    )}
                  >
                    <HugeiconsIcon icon={tile.icon} strokeWidth={2.25} className={tile.hero ? "h-5 w-5 md:h-6 md:w-6" : "h-5 w-5"} />
                  </span>
                  <CardTitle className={cn("mt-4 font-semibold text-foreground", tile.hero ? "text-lg md:text-2xl" : "text-base")}>
                    {tile.title}
                  </CardTitle>
                  <CardDescription className={cn("mt-2", tile.hero ? "text-sm md:text-base" : "text-sm")}>
                    {tile.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default FeatureOverviewBento;
