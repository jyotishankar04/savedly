"use client";

import { motion, type Variants } from "motion/react";
import { GraphPreviewCard } from "@/components/marketing/landing/graph-preview-card";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", damping: 26, stiffness: 120 },
  },
};

export function GraphSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Your library has a shape
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          Nothing you save sits alone.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Related by meaning, by tag, or by the collection you put it in — every
          memory ends up next to the ones it actually belongs with.
        </p>
      </div>

      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUpVariants}>
        <GraphPreviewCard />
      </motion.div>
    </section>
  );
}

export default GraphSection;
