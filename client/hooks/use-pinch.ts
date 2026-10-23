import { useEffect, useRef, type RefObject } from "react";

/**
 * A two-finger pinch on a touch screen, inside `ref`: fingers spreading
 * (zooming in) calls onPinchOut, closing (zooming out) onPinchIn, once per
 * pinch, after the gap between them changes by `threshold` (a quarter by
 * default). Inside the element, a two-finger move doesn't also zoom the page.
 * Touch only: Ctrl+scroll and a trackpad pinch stay the browser's own zoom.
 */
export function usePinch(
  ref: RefObject<HTMLElement | null>,
  { onPinchIn, onPinchOut }: { onPinchIn: () => void; onPinchOut: () => void },
  threshold = 0.25,
) {
  const handlers = useRef({ onPinchIn, onPinchOut });
  useEffect(() => {
    handlers.current = { onPinchIn, onPinchOut };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    let done = false;
    const gap = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      start = gap(event.touches);
      done = false;
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !start) return;
      event.preventDefault();
      if (done) return;
      const ratio = gap(event.touches) / start;
      if (ratio > 1 + threshold) {
        done = true;
        handlers.current.onPinchOut();
      } else if (ratio < 1 - threshold) {
        done = true;
        handlers.current.onPinchIn();
      }
    };
    const onEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) start = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, threshold]);
}
