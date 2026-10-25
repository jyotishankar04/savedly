"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

// Long enough for a tab's content to leave and the next to arrive (AnimatePresence's exit, then the enter).
const SWITCH_WINDOW_MS = 900;

/**
 * A box that eases to the height of what's in it when `changeKey` changes
 * (a dialog switching tabs), instead of jumping. Any other change of height,
 * like a note growing as it's typed, it simply follows. It clips only while
 * it's moving, so menus inside it (the editor's / menu) aren't cut off.
 */
export function AutoHeight({ children, changeKey, className }: { children: ReactNode; changeKey: string; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [moving, setMoving] = useState(false);
  const easeUntil = useRef(0);
  const firstKey = useRef(changeKey);
  const reduced = useReducedMotion();

  // On a switch: hold the current height, then ease to each new one for a moment.
  useLayoutEffect(() => {
    if (changeKey === firstKey.current && easeUntil.current === 0) return;
    firstKey.current = changeKey;
    easeUntil.current = Date.now() + SWITCH_WINDOW_MS;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measured from the DOM before the new tab's content arrives
    setHeight(inner.current?.offsetHeight ?? "auto");
  }, [changeKey]);

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (Date.now() < easeUntil.current) setHeight(node.offsetHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ height }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
      onAnimationStart={() => setMoving(height !== "auto")}
      onAnimationComplete={() => {
        setMoving(false);
        // Settled after a switch: back to following the content as it is.
        if (height !== "auto" && Date.now() >= easeUntil.current) setHeight("auto");
      }}
      style={{ overflow: moving ? "hidden" : "visible" }}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
