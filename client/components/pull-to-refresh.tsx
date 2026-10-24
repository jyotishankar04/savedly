"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** How far the finger has to pull (after the drag is halved) before letting go refreshes. */
const TRIGGER = 70;
const MAX = 110;

/** The nearest element above `el` that scrolls up and down, or the page itself. */
function scrollerOf(el: Element | null): Element {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Pull to refresh in the app, on a touch screen: at the top of a list, drag
 * down with one finger and let go past the line, and everything on screen is
 * fetched again. The app's pages scroll inside their own area, so the
 * browser's own pull-to-refresh never reaches them, and an app added to the
 * home screen has no reload button at all. Not inside dialogs or text boxes,
 * and a sideways or two-finger move is left alone (swipes, pinches).
 */
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // While the finger is down the indicator follows it exactly; afterwards it eases.
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const pulled = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      start.current = null;
      if (busy.current || event.touches.length !== 1) return;
      const target = event.target as Element | null;
      if (target?.closest('[role="dialog"], input, textarea, select, [contenteditable="true"]')) return;
      if (scrollerOf(target).scrollTop > 0) return;
      start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onMove = (event: TouchEvent) => {
      if (!start.current) return;
      if (event.touches.length !== 1) {
        start.current = null;
        pulled.current = 0;
        setPull(0);
        setDragging(false);
        return;
      }
      const dy = event.touches[0].clientY - start.current.y;
      const dx = Math.abs(event.touches[0].clientX - start.current.x);
      // Up, or more sideways than down: not a pull.
      if (dy <= 0 || dx > dy) {
        if (pulled.current) {
          pulled.current = 0;
          setPull(0);
        }
        if (dy < 0 || dx > 12) start.current = null;
        return;
      }
      const next = Math.min(MAX, dy * 0.5);
      setDragging(true);
      if ((next >= TRIGGER) !== (pulled.current >= TRIGGER) && next >= TRIGGER) navigator.vibrate?.(8);
      pulled.current = next;
      setPull(next);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      setDragging(false);
      const far = pulled.current >= TRIGGER;
      pulled.current = 0;
      if (!far) {
        setPull(0);
        return;
      }
      busy.current = true;
      setRefreshing(true);
      setPull(TRIGGER);
      // Long enough to see that it happened, even when the refetch is instant.
      Promise.all([queryClient.refetchQueries({ type: "active" }), new Promise((r) => setTimeout(r, 600))]).finally(() => {
        busy.current = false;
        setRefreshing(false);
        setPull(0);
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [queryClient]);

  const ready = pull >= TRIGGER;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 flex justify-center md:hidden"
      style={{ transform: `translateY(${pull - 48}px)`, opacity: Math.min(1, pull / TRIGGER), transition: dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease" }}
    >
      <span className={cn("grid size-10 place-items-center rounded-full border border-border bg-card shadow-lg transition-colors", ready || refreshing ? "text-primary" : "text-muted-foreground")}>
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={2.25} className={cn("size-5", refreshing && "animate-spin motion-reduce:animate-none")} style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </span>
      <span className="sr-only">{refreshing ? "Refreshing" : ready ? "Release to refresh" : ""}</span>
    </div>
  );
}
