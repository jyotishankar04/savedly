"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

type Box = { x: number; y: number; width: number; height: number }

/**
 * A list of links or buttons with one highlight that glides from row to row
 * under the pointer, the way the command palette's does, instead of each row
 * lighting up by itself. Used by every sidebar.
 *
 * Mark each row with `data-nav-row` and give it `relative z-[1]` so its text
 * sits above the highlight. Rows should have no hover background of their
 * own. A row with `aria-current` (the page or item you are on) keeps its own
 * fill and the highlight stays off it.
 *
 * It follows keyboard focus too, fades in when the pointer arrives and out
 * when it leaves, and moves without the spring under reduced motion.
 */
export function GlidingHighlight<T extends "nav" | "div" | "aside" | "ul" = "nav">({
  as,
  className,
  highlightClassName,
  children,
  ...props
}: {
  as?: T
  /** The highlight's own look. Defaults to a soft muted fill with rounded corners. */
  highlightClassName?: string
} & Omit<React.ComponentProps<"div">, "onPointerMove" | "onPointerLeave" | "onFocus" | "onBlur">) {
  const Tag = (as ?? "nav") as "div"
  const root = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState<Box | null>(null)
  const reduced = useReducedMotion()

  const moveTo = (target: EventTarget | null) => {
    const el = target instanceof Element ? target : null
    const row = el?.closest<HTMLElement>("[data-nav-row]")
    const host = root.current
    if (!host) return
    if (!row || row.hasAttribute("aria-current")) {
      // Between rows it stays where it was; on another control, or the current row, it goes.
      if (!row && !el?.closest("a, button")) return
      setBox(null)
      return
    }
    const r = row.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    // The host may scroll, and the highlight scrolls with its content.
    const next = { x: r.left - h.left + host.scrollLeft, y: r.top - h.top + host.scrollTop, width: r.width, height: r.height }
    setBox((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height ? prev : next))
  }

  return (
    <Tag
      ref={root}
      className={cn("relative", className)}
      onPointerMove={(e) => e.pointerType !== "touch" && moveTo(e.target)}
      onPointerLeave={() => setBox(null)}
      onFocus={(e) => e.target.matches(":focus-visible") && moveTo(e.target)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setBox(null)}
      {...props}
    >
      <AnimatePresence>
        {box && (
          <motion.span
            aria-hidden
            data-slot="gliding-highlight"
            className={cn("pointer-events-none absolute top-0 left-0 z-0 rounded-lg bg-muted/70", highlightClassName)}
            // It appears in place, then travels.
            initial={{ opacity: 0, ...box }}
            animate={{ opacity: 1, ...box }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38, opacity: { duration: 0.12 } }}
          />
        )}
      </AnimatePresence>
      {children}
    </Tag>
  )
}
