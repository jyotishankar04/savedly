"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * A thin line across the top of the window that fills as you read down a
 * long page (a policy, a blog post), scrubbed to the scroll by GSAP. Purely
 * decorative, so it's hidden from screen readers, and it doesn't appear for
 * reduced motion.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(bar.current, { autoAlpha: 1 });
      gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
    });
  });

  return <div ref={bar} aria-hidden className="pointer-events-none invisible fixed inset-x-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-primary" />;
}
