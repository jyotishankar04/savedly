"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  label: string;
  icon: IconSvgElement;
  tone: "primary" | "amber";
  run: () => void;
  /** The item leaves the list (Archive): the row slides off rather than springing back. */
  leaves?: boolean;
}

const SLOP = 8;
const TONE = {
  primary: { soft: "bg-primary/12 text-primary", solid: "bg-primary text-primary-foreground" },
  amber: { soft: "bg-amber-500/15 text-amber-600 dark:text-amber-400", solid: "bg-amber-500 text-white" },
};

/**
 * A row or card that acts on a sideways swipe, on a touch screen: the action
 * shows behind it as it follows the finger, and letting go past the threshold
 * (with a small buzz as it's reached) does it. `swipeRight` is the action
 * revealed at the left edge, `swipeLeft` at the right. A row that leaves the
 * list slides off; otherwise it springs back. Up-and-down movement is left to
 * the page, so lists still scroll, and a mouse never swipes: every action
 * here is also in the item's own buttons or menu.
 */
export function SwipeRow({
  swipeRight,
  swipeLeft,
  disabled = false,
  className,
  children,
}: {
  swipeRight?: SwipeAction;
  swipeLeft?: SwipeAction;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; width: number; locked: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [side, setSide] = useState<"right" | "left" | null>(null);
  const [armed, setArmed] = useState(false);
  // A half-width card has no room for the words: just the icon shows behind it.
  const [narrow, setNarrow] = useState(false);
  const stopWatching = useRef<(() => void) | null>(null);
  useEffect(() => () => stopWatching.current?.(), []);

  const actionFor = (s: "right" | "left" | null) => (s === "right" ? swipeRight : s === "left" ? swipeLeft : undefined);
  const threshold = (width: number) => Math.min(width * 0.35, 140);
  const settle = (to: number, onDone?: () => void) => {
    if (reduce) {
      x.jump(to);
      onDone?.();
      return;
    }
    void animate(x, to, { type: "spring", stiffness: 420, damping: 38 }).then(() => onDone?.());
  };
  const reset = () => {
    settle(0, () => {
      setSide(null);
      setArmed(false);
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (disabled || event.pointerType !== "touch" || !event.isPrimary || (!swipeRight && !swipeLeft)) return;
    const width = box.current?.offsetWidth ?? 320;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width, locked: false };
    setNarrow(width < 240);
    // A second finger anywhere makes it a pinch (it switches the view), never a swipe.
    stopWatching.current?.();
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length < 2 || !drag.current) return;
      drag.current = null;
      swallowClick.current = false;
      reset();
    };
    window.addEventListener("touchstart", onTouch, { passive: true });
    stopWatching.current = () => {
      window.removeEventListener("touchstart", onTouch);
      stopWatching.current = null;
    };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.locked) {
      if (Math.hypot(dx, dy) < SLOP) return;
      // Mostly up or down: a scroll, not a swipe.
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.locked = true;
      box.current?.setPointerCapture(event.pointerId);
    }
    const s = dx > 0 ? "right" : "left";
    const action = actionFor(s);
    // No action that way: it barely moves, like pulling against something.
    const value = action ? dx : dx * 0.12;
    x.set(value);
    setSide(action ? s : null);
    const isArmed = !!action && Math.abs(value) > threshold(d.width);
    if (isArmed !== armed) {
      setArmed(isArmed);
      if (isArmed) navigator.vibrate?.(8);
    }
  };
  const onPointerEnd = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    stopWatching.current?.();
    if (!d.locked) return;
    swallowClick.current = true;
    const action = actionFor(side);
    if (!armed || !action) {
      reset();
      return;
    }
    if (action.leaves) {
      // Off the edge, then the list drops it; if it's still here a moment later
      // (it failed, or Undo put it back) it comes home.
      settle((side === "right" ? 1 : -1) * (d.width + 24), () => {
        action.run();
        window.setTimeout(reset, 1200);
      });
    } else {
      action.run();
      reset();
    }
  };

  const action = actionFor(side);
  const tone = action ? TONE[action.tone] : null;

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(event) => {
        // The tap that ends a swipe isn't a click on the item.
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cn("relative touch-pan-y overflow-hidden", className)}
    >
      {action && tone && (
        <div aria-hidden className={cn("absolute inset-0 flex items-center transition-colors duration-150", narrow ? "px-4" : "px-5", side === "right" ? "justify-start" : "justify-end", armed ? tone.solid : tone.soft)}>
          <span className={cn("flex items-center gap-2 text-sm font-medium transition-transform duration-150", armed && "scale-110")}>
            <HugeiconsIcon icon={action.icon} strokeWidth={2} className="size-5" />
            {!narrow && action.label}
          </span>
        </div>
      )}
      {/* Opaque, so the action only shows where the row has moved off it. */}
      <motion.div style={{ x }} className="relative h-full bg-background">
        {children}
      </motion.div>
    </div>
  );
}
