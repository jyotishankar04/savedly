"use client"

import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ArrowBigUp } from "lucide-react"
import { cn } from "@/lib/utils"

// An upvote pill (shadcn-space button-21): a little burst of particles and a
// ripple on voting, the arrow hops, and the count rolls to its new number.
// Changed from the original to fit the site: it's controlled (the vote and
// count come from the caller, who saves them), and it takes the theme's
// colours, with the brand blue where the original used orange.

const COLORS = ["bg-primary", "bg-primary/70", "bg-sky-400", "bg-primary/50"]

const COUNT = 6
const PARTICLES = Array.from({ length: COUNT }, (_, i) => {
  const angle = -150 + (i / (COUNT - 1)) * 120 // -150° → -30° (upward arc)
  const rad = (angle * Math.PI) / 180
  const dist = 30 + (i % 2) * 15
  return {
    id: i,
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    color: COLORS[i % COLORS.length],
    size: 4 + (i % 2),
    dur: 0.5 + (i % 3) * 0.07,
  }
})

export interface UpVoteButtonProps {
  voted: boolean
  count: number
  onToggle: () => void
  /** What a screen reader hears, e.g. "Upvote Firefox extension (12)". */
  label?: string
  title?: string
  className?: string
}

export default function UpVoteButton({ voted, count, onToggle, label, title, className }: UpVoteButtonProps) {
  const reduce = useReducedMotion()
  const [clickKey, setClickKey] = useState(0)

  const handleClick = () => {
    if (!voted) setClickKey((k) => k + 1)
    onToggle()
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Particles, only for a vote made just now (not one already there when the page loaded) */}
      <AnimatePresence>
        {voted &&
          clickKey > 0 &&
          !reduce &&
          PARTICLES.map((p) => (
            <motion.span
              key={`${p.id}-${clickKey}`}
              className={cn("pointer-events-none absolute rounded-full", p.color)}
              style={{ width: p.size, height: p.size, left: "50%", top: "50%", marginLeft: -(p.size / 2), marginTop: -(p.size / 2) }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: [0, p.y * 0.6, p.y], opacity: [1, 1, 0], scale: 0.5 }}
              exit={{}}
              transition={{ duration: p.dur, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
      </AnimatePresence>

      {/* Pill */}
      <motion.button
        type="button"
        onClick={handleClick}
        aria-pressed={voted}
        aria-label={label}
        title={title}
        whileHover={reduce ? undefined : { scale: 1.04 }}
        whileTap={reduce ? undefined : { scale: 0.88 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
        className={cn(
          "relative inline-flex cursor-pointer select-none items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          voted ? "bg-primary/10 ring-primary/30" : "bg-muted ring-foreground/10 hover:ring-primary/40",
        )}
      >
        {/* Ripple */}
        <AnimatePresence initial={false}>
          {clickKey > 0 && !reduce && (
            <motion.span
              key={clickKey}
              className="pointer-events-none absolute h-5 w-5 rounded-full bg-primary/25"
              style={{ top: "50%", left: "50%", marginLeft: -10, marginTop: -10 }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 15, opacity: 0 }}
              exit={{}}
              transition={{
                scale: { duration: 1.1, ease: "easeOut" },
                opacity: { duration: 1.0, ease: "easeIn", delay: 0.1 },
              }}
            />
          )}
        </AnimatePresence>

        {/* Arrow */}
        <motion.div
          key={`icon-${clickKey}`}
          animate={reduce ? undefined : voted ? { y: [0, -4, 1, -2, 0] } : { y: [0, 3, 0] }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ArrowBigUp
            className={cn("size-5 transition-colors duration-300", voted ? "text-primary" : "text-muted-foreground")}
            fill={voted ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </motion.div>

        {/* Count */}
        <div className="flex h-5 min-w-[2ch] items-center overflow-hidden tabular-nums">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={count}
              initial={reduce ? false : { y: voted ? 12 : -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: voted ? -12 : 12, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0.2, 1] }}
              className={cn("block text-sm font-semibold", voted ? "text-primary" : "text-foreground")}
            >
              {count.toLocaleString()}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.button>
    </div>
  )
}
