"use client";

import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import type { MemoryType } from "@/types/memory";
import { Marquee } from "./marquee";

// Concrete things people actually save, each mapped back to one of the six
// real ingestion pipelines (route-media-type.ts) via its icon — not a fixed
// count of "formats" to enumerate, which is the honest version of "multiple
// formats": the pipeline count is fixed, the things it accepts aren't.
interface Example {
  label: string;
  type: MemoryType;
}

const ROW_A: Example[] = [
  { label: "Article", type: "web" },
  { label: "YouTube video", type: "video" },
  { label: "Voice memo", type: "voice" },
  { label: "PDF", type: "document" },
  { label: "Screenshot", type: "image" },
  { label: "Markdown note", type: "note" },
  { label: "Product page", type: "web" },
];

const ROW_B: Example[] = [
  { label: "Podcast episode", type: "voice" },
  { label: "Recipe", type: "web" },
  { label: "Slide deck", type: "document" },
  { label: "Conference talk", type: "video" },
  { label: "Tweet thread", type: "web" },
  { label: "Code snippet", type: "note" },
  { label: "Research paper", type: "document" },
];

// The six pipelines those examples actually resolve to — shown once, below
// the marquee, so the open-ended list above stays grounded in something real
// rather than implying infinite distinct formats.
const PIPELINES: { type: MemoryType; label: string }[] = [
  { type: "web", label: "Web" },
  { type: "video", label: "Video" },
  { type: "note", label: "Notes" },
  { type: "image", label: "Images" },
  { type: "document", label: "Documents" },
  { type: "voice", label: "Voice" },
];

function Chip({ example }: { example: Example }) {
  return (
    <span className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/85">
      <HugeiconsIcon icon={MEMORY_TYPE_ICONS[example.type]} strokeWidth={2.25} className="h-4 w-4 text-primary" />
      {example.label}
    </span>
  );
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 26, stiffness: 120 },
  },
};

/**
 * Two marquee rows of concrete saved-item examples, scrolling opposite
 * directions, closing on a static legend of the six real ingestion
 * pipelines those examples resolve to. The marquee's open-endedness is the
 * point: it never claims a fixed number of "formats," only that whatever
 * you throw at it has already been seen.
 */
export function FormatGridSection() {
  return (
    <section className="mx-auto w-full max-w-5xl py-24 sm:py-32">
      <div className="mx-auto mb-14 max-w-2xl px-6 text-center sm:mb-20 md:px-12">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Multiple formats, one box
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          Whatever it is, it goes in the same place.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Each one gets read differently on the way in — you never have to tell
          it which pipeline to use.
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUpVariants}
        className="flex flex-col gap-3"
      >
        <Marquee speed={38}>
          {ROW_A.map((example, i) => (
            <Chip key={`a-${i}`} example={example} />
          ))}
        </Marquee>
        <Marquee speed={42} reverse>
          {ROW_B.map((example, i) => (
            <Chip key={`b-${i}`} example={example} />
          ))}
        </Marquee>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUpVariants}
        className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 sm:mt-20 md:px-12"
      >
        {PIPELINES.map((pipeline) => (
          <span key={pipeline.type} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <HugeiconsIcon icon={MEMORY_TYPE_ICONS[pipeline.type]} strokeWidth={2} className="h-3.5 w-3.5" />
            {pipeline.label}
          </span>
        ))}
      </motion.div>
    </section>
  );
}

export default FormatGridSection;
