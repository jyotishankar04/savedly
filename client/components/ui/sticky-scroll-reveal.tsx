"use client";
import React, { useRef } from "react";
import { useMotionValueEvent, useScroll, motion } from "motion/react";
import { cn } from "@/lib/utils";

// From @shoogle/aceternity/sticky-scroll-reveal (Manu Arora), with the
// generic dark-demo styling replaced by this project's theme tokens:
// the original hard-codes text-slate-100/300, a 3-color dark background
// cycle (#0f172a/#000/#171717), and a plain bg-white content box behind a
// linear-gradient swap — all invisible or wrong in light mode, and none of
// it makes sense once the "content" slot holds real interactive UI (a
// force-graph canvas, a live vault demo) instead of a flat color block.
// The scroll-tracking mechanism itself (nearest-breakpoint activeCard via
// useScroll on an internal container) is unchanged.
export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode;
  }[];
  contentClassName?: string;
}) => {
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
      const distance = Math.abs(latest - breakpoint);
      if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
        return index;
      }
      return acc;
    }, 0);
    setActiveCard(closestBreakpointIndex);
  });

  return (
    // ring-foreground/10, not border-border: this repo's dark theme sets
    // --border to the exact same value as --card (checked app/globals.css),
    // so a border-border edge on a bg-card element renders invisible in
    // dark mode. A ring at a fixed foreground alpha doesn't depend on that
    // token relationship holding.
    <div ref={ref} className="relative flex h-[34rem] justify-center gap-10 overflow-y-auto rounded-2xl bg-card p-10 ring-1 ring-foreground/10">
      <div className="relative flex items-start px-4">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-20 first:mt-0">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
                className="text-2xl font-semibold text-foreground"
              >
                {item.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
                className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground"
              >
                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-40" />
        </div>
      </div>
      <div
        className={cn(
          "sticky top-10 hidden h-[24rem] w-[24rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 lg:flex",
          contentClassName
        )}
      >
        {content[activeCard]?.content ?? null}
      </div>
    </div>
  );
};

export default StickyScroll;
