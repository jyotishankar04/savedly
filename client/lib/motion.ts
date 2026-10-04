import type { Transition } from "motion/react";

/**
 * The app's motion language.
 *
 * These values are lifted from components/ui/github-activity.tsx, which is the
 * reference component for this design system — they live here so every other
 * animated surface springs the same way instead of each one inventing its own
 * stiffness/damping pair.
 *
 * Durations are deliberately expressed as motion's `bounce` + `duration` rather
 * than a physical stiffness/damping/mass triple: it keeps every spring in the
 * app comparable at a glance, and bounce is the only knob worth varying.
 */
export const SPRING = { type: "spring", bounce: 0.2, duration: 0.62 } as const satisfies Transition;

/** Livelier, for elements that expand or pop in rather than settle. */
export const SPRING_BOUNCY = { ...SPRING, bounce: 0.45 } as const satisfies Transition;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Opacity-only crossfades — a spring on opacity reads as a flicker. */
export const FADE = { duration: 0.2, ease: EASE_OUT } as const satisfies Transition;

/** Tooltips and other transient overlays, which must not feel laggy. */
export const FADE_FAST = { duration: 0.14, ease: EASE_OUT } as const satisfies Transition;

/** Per-item delay when revealing a list. Keep small — it compounds. */
export const STAGGER = 0.05;

/** Travel distance for fade-and-rise. Larger values read as the page jumping. */
export const RISE_OFFSET = 8;

/** Collapses any transition to an instant cut, for prefers-reduced-motion. */
export const INSTANT = { duration: 0 } as const satisfies Transition;
