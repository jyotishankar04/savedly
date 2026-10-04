"use client";

import { Fraunces } from "next/font/google";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

// Display serif for the oversized numerals only — scoped to this file rather
// than promoted to the app's --font-serif token, which stays the system
// stack for prose elsewhere (blockquotes, etc.) unless a real design
// decision says otherwise.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-numeral",
});

interface Step {
  numeral: string;
  title: string;
  body: string;
}

// The four ingestion.nodes stages that actually run — server/src/modules/ai/ingestion/nodes/:
// route-media-type → {transcribe-audio, process-image-vision, extract-doc-text} → generate-ai-insights
// + organize-collection → semantic-chunker → generate-embeddings → upsert-vectors.
const STEPS: Step[] = [
  {
    numeral: "01",
    title: "In",
    body: "Paste a link, drop a file, or send a voice note. One box takes all six formats.",
  },
  {
    numeral: "02",
    title: "Read",
    body: "Audio is transcribed, images go through OCR and vision, documents and pages get their text pulled out.",
  },
  {
    numeral: "03",
    title: "Understood",
    body: "Summarized, tagged, and filed into a collection — no folder to pick, no tag to type.",
  },
  {
    numeral: "04",
    title: "Connected",
    body: "Chunked, embedded, and linked into your memory graph, next to everything else you've kept.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 26, stiffness: 110 },
  },
};

const archVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: "blur(10px)" },
  show: {
    opacity: 1, scale: 1, filter: "blur(0px)",
    transition: { type: "spring", damping: 22, stiffness: 90, delay: 0.15 },
  },
};

/**
 * A node-and-thread motif standing in for "central arched image" — an SVG
 * graph rather than a screenshot, so it reads as the memory graph itself
 * (the same visual idea as the hero art) instead of a UI mockup that would
 * need updating every time the dashboard changes.
 */
function GraphGlyph() {
  const nodes = [
    [50, 22], [22, 42], [78, 42], [32, 68], [68, 68], [50, 86],
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 4], [2, 3],
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.6">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
      </g>
      {nodes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 5 ? 4.5 : 3} fill="currentColor" />
      ))}
    </svg>
  );
}

function StepCard({ step, align }: { step: Step; align: "left" | "right" }) {
  return (
    <motion.div
      variants={stepVariants}
      className={cn(
        "relative flex flex-col gap-2",
        align === "right" && "lg:items-end lg:text-right"
      )}
    >
      <span
        className={cn(
          fraunces.variable,
          "pointer-events-none leading-none text-foreground/10 select-none",
          "text-[5rem] sm:text-[6rem]"
        )}
        style={{ fontFamily: "var(--font-numeral)" }}
        aria-hidden="true"
      >
        {step.numeral}
      </span>
      <div className={cn("-mt-10 flex flex-col gap-1.5 sm:-mt-12", align === "right" && "lg:items-end")}>
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="max-w-[26ch] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </div>
    </motion.div>
  );
}

/**
 * How-it-works section: four steps orbiting a central arched panel. Desktop
 * splits the steps two-and-two around the arch (a 3-column grid, the centre
 * column spanning both rows); mobile stacks arch-then-steps since there's no
 * room to orbit anything at that width.
 */
export function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-24">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          How it works
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          From one link to a linked memory.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Everything you save moves through the same four stages before it&rsquo;s
          searchable — no manual filing, no separate step for &ldquo;organize this later.&rdquo;
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-10"
      >
        <div className="order-2 flex flex-col gap-16 lg:order-1">
          <StepCard step={STEPS[0]} align="right" />
          <StepCard step={STEPS[2]} align="right" />
        </div>

        {/* Central arch */}
        <motion.div
          variants={archVariants}
          className="order-1 mx-auto flex w-full max-w-sm flex-col items-center lg:order-2 lg:w-72"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-full border border-border bg-gradient-to-b from-primary/10 via-card to-card">
            <div className="absolute inset-0 flex items-center justify-center p-10 text-primary">
              <GraphGlyph />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-t-full ring-1 ring-inset ring-foreground/5" />
          </div>
          <p className="mt-5 text-center text-xs font-medium tracking-wide text-muted-foreground">
            Every memory lands here — in the graph, connected to the rest.
          </p>
        </motion.div>

        <div className="order-3 flex flex-col gap-16">
          <StepCard step={STEPS[1]} align="left" />
          <StepCard step={STEPS[3]} align="left" />
        </div>
      </motion.div>
    </section>
  );
}

export default HowItWorksSection;
