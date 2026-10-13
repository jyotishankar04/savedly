import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the visitor asked for less motion, for components that render
 * something different when they did (other text, other markup).
 *
 * The server can't know the setting, so it renders as if motion is allowed.
 * This hook says the same during the browser's first render, then switches,
 * which keeps the two renders identical. motion's own useReducedMotion()
 * answers truthfully straight away, and so causes a hydration error wherever
 * the answer changes what is drawn.
 */
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
