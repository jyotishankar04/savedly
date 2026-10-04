"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { RISE_OFFSET, SPRING, STAGGER } from "@/lib/motion";

// Typed as a plain div rather than motion.div: the drag/animation handlers
// have incompatible signatures between the two, and this renders a plain div
// in the reduced-motion branch anyway.
export interface RevealProps
  extends Omit<React.ComponentProps<"div">, "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"> {
  /** Position in a list — each step delays the animation by one stagger beat. */
  index?: number;
  /** Travel distance in px. Keep it small; large values read as the page jumping. */
  offset?: number;
}

/**
 * Fade-and-rise on mount, for cards, panels and list items.
 *
 * Honours prefers-reduced-motion by rendering the final state immediately —
 * this is the only animation wrapper in the app, so getting that right here
 * covers every caller.
 */
export function Reveal({ index = 0, offset = RISE_OFFSET, children, ...props }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div {...props}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * STAGGER }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
