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
}

function FolderCardFace({ count, label, badge, badgeClassName }: Pick<FolderCardProps, "count" | "label" | "badge" | "badgeClassName">) {
  return (
    <>
      {/* Papers peeking out from behind the folder */}
      <motion.div
        variants={{ closed: { y: 0, opacity: 0.55 }, open: { y: -16, opacity: 0.9 } }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="absolute inset-x-7 top-1 h-28 -rotate-2 rounded-lg border border-border/60 bg-muted-foreground/15"
      />
      <motion.div
        variants={{ closed: { y: 0, opacity: 0.4 }, open: { y: -10, opacity: 0.75 } }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.02 }}
        className="absolute inset-x-6 top-2 h-28 rotate-2 rounded-lg border border-border/60 bg-muted-foreground/15"
      />

      {/* Folder tab — flush with the lid's left edge, mostly hidden behind it */}
      <div className="absolute left-0 top-3 h-8 w-[42%] rounded-t-2xl border border-b-0 border-border/60 bg-muted dark:bg-card" />

      {/* Folder lid — tilts open around its bottom edge on hover */}
      <motion.div
        variants={{ closed: { rotateX: 0, y: 0 }, open: { rotateX: -14, y: 3 } }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        style={{ transformOrigin: "bottom", transformStyle: "preserve-3d" }}
        className="absolute inset-x-0 bottom-0 top-7 flex flex-col justify-between rounded-2xl rounded-tl-none border border-border/60 bg-muted p-5 shadow-lg shadow-black/10 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-black/20 dark:bg-card dark:shadow-black/40 dark:group-hover:shadow-black/60"
      >
        <span className="text-5xl font-bold text-foreground/70">{count}</span>
        <div className="flex items-end justify-between gap-3">
          <span className="truncate text-sm font-medium text-foreground">{label}</span>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-lg shadow-black/20 ring-1 ring-white/10", badgeClassName)}>
            {badge}
          </div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * A folder-shaped card whose lid tilts open on hover/tap, revealing a stack
 * of "papers" peeking out from behind — built with the `motion` library's
 * variant propagation, so the parent link only needs one `whileHover`/
 * `whileTap` and every child (papers, lid) animates off the same "open"
 * state.
 */
export function FolderCard({ href, onClick, count, label, badge, badgeClassName, className }: FolderCardProps) {
  const face = <FolderCardFace count={count} label={label} badge={badge} badgeClassName={badgeClassName} />;

  if (href) {
    return (
      <MotionLink
        href={href}
        initial="closed"
        whileHover="open"
        whileTap="open"
        className={cn("group relative block h-44 select-none [perspective:1000px]", className)}
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
      whileHover="open"
      whileTap="open"
      className={cn("group relative block h-44 cursor-pointer select-none [perspective:1000px]", className)}
    >
      {face}
    </motion.div>
  );
}
