"use client";

import { Children, type ReactNode } from "react";
import { motion, MotionConfig, type Variants } from "motion/react";

// Motion's half of the marketing pages' movement: things that simply appear
// as you reach them. Both wrap server-rendered children, so pages stay
// server components. Reduced motion keeps the fade and drops the travel
// (MotionConfig reducedMotion="user").

const EASE = [0.16, 1, 0.3, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } };

/** One block that fades up the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        variants={{ hidden: rise.hidden, shown: { ...(rise.shown as object), transition: { duration: 0.8, ease: EASE, delay } } }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/**
 * Each child fades up in turn once the group scrolls into view: cards in a
 * grid, rows in a list. The group takes the layout classes (a grid, a stack),
 * and each child keeps its own; `itemClassName` goes on the wrapper around
 * every child when a grid cell needs it (h-full, for one).
 */
export function RevealList({ children, className, itemClassName, gap = 0.07, as = "div" }: { children: ReactNode; className?: string; itemClassName?: string; gap?: number; as?: "div" | "ul" | "ol" | "dl" }) {
  const Group = as === "ul" ? motion.ul : as === "ol" ? motion.ol : as === "dl" ? motion.dl : motion.div;
  const Item = as === "ul" || as === "ol" ? motion.li : motion.div;
  return (
    <MotionConfig reducedMotion="user">
      <Group className={className} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "0px 0px -10% 0px" }} variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}>
        {Children.toArray(children).map((child, i) => (
          <Item key={i} variants={rise} className={itemClassName}>
            {child}
          </Item>
        ))}
      </Group>
    </MotionConfig>
  );
}
