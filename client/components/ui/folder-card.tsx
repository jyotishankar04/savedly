"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

interface FolderCardProps {
  /** Renders as a navigable link. Omit and pass `onClick` instead for in-page browsing (e.g. drilling into a folder without a route change). */
  href?: string;
  onClick?: () => void;
  count: number;
  label: string;
  badge: React.ReactNode;
  badgeClassName?: string;
  className?: string;
  /** Picked in a bulk selection: the folder stays open, and its tab and lid take the accent colour. */
  selected?: boolean;
}

// The lid's own fill with a little of the accent mixed in, opaque so the papers behind it stay hidden.
const SELECTED_FILL =
  "border-primary/70 bg-[color-mix(in_oklab,var(--primary)_12%,var(--muted))] dark:bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))]";

function FolderCardFace({ count, label, badge, badgeClassName, selected }: Pick<FolderCardProps, "count" | "label" | "badge" | "badgeClassName" | "selected">) {
  return (
    <>
      {/* Papers peeking out from behind the folder */}
      <motion.div
        variants={{ closed: { y: 0, opacity: 0.55 }, open: { y: -16, opacity: 0.9 }, picked: { y: -16, opacity: 0.9 } }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="absolute inset-x-5 top-1 h-20 -rotate-2 rounded-lg sm:inset-x-7 sm:h-28 border border-border/60 bg-muted-foreground/15"
      />
      <motion.div
        variants={{ closed: { y: 0, opacity: 0.4 }, open: { y: -10, opacity: 0.75 }, picked: { y: -10, opacity: 0.75 } }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.02 }}
        className="absolute inset-x-4 top-2 h-20 rotate-2 rounded-lg sm:inset-x-6 sm:h-28 border border-border/60 bg-muted-foreground/15"
      />

      {/* Folder tab — flush with the lid's left edge, mostly hidden behind it */}
      <div
        className={cn(
          "absolute left-0 top-2.5 h-7 w-[42%] rounded-t-xl sm:top-3 sm:h-8 sm:rounded-t-2xl border border-b-0 border-border/60 bg-muted transition-colors dark:bg-card",
          selected && SELECTED_FILL,
        )}
      />

      {/* Folder lid — tilts open around its bottom edge on hover */}
      <motion.div
        // Picked keeps the lid flat: a held tilt would leave its text soft.
        variants={{ closed: { rotateX: 0, y: 0 }, open: { rotateX: -14, y: 3 }, picked: { rotateX: 0, y: 0 } }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        style={{ transformOrigin: "bottom", transformStyle: "preserve-3d" }}
        className={cn(
          "absolute inset-x-0 bottom-0 top-6 flex flex-col justify-between rounded-xl rounded-tl-none border border-border/60 bg-muted p-3.5 shadow-lg sm:top-7 sm:rounded-2xl sm:p-5 shadow-black/10 transition-[box-shadow,background-color,border-color] duration-300 group-hover:shadow-2xl group-hover:shadow-black/20 dark:bg-card dark:shadow-black/40 dark:group-hover:shadow-black/60",
          selected && SELECTED_FILL,
        )}
      >
        <span className={cn("text-3xl font-bold transition-colors sm:text-5xl", selected ? "text-primary" : "text-foreground/70")}>{count}</span>
        <div className="flex items-end justify-between gap-3">
          <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground [overflow-wrap:anywhere] sm:line-clamp-1 sm:text-sm">{label}</span>
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-base shadow-lg sm:size-10 sm:rounded-xl sm:text-lg shadow-black/20 ring-1 ring-white/10", badgeClassName)}>
            {badge}
          </div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * Smaller on a phone (two to a row there), full size from sm up.
 *
 * A folder-shaped card whose lid tilts open on hover/tap, revealing a stack
 * of "papers" peeking out from behind — built with the `motion` library's
 * variant propagation, so the parent link only needs one `whileHover`/
 * `whileTap` and every child (papers, lid) animates off the same "open"
 * state.
 */
export function FolderCard({ href, onClick, count, label, badge, badgeClassName, className, selected }: FolderCardProps) {
  const face = <FolderCardFace count={count} label={label} badge={badge} badgeClassName={badgeClassName} selected={selected} />;
  // Picked: the papers stay lifted out of the folder.
  const state = selected ? "picked" : "closed";

  if (href) {
    return (
      <MotionLink
        href={href}
        initial="closed"
        animate={state}
        whileHover="open"
        whileTap="open"
        className={cn("group relative block h-32 select-none [perspective:1000px] sm:h-44", className)}
      >
        {face}
      </MotionLink>
    );
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      initial="closed"
      animate={state}
      whileHover="open"
      whileTap="open"
      className={cn("group relative block h-32 cursor-pointer select-none [perspective:1000px] sm:h-44", className)}
    >
      {face}
    </motion.div>
  );
}
