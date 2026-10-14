"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, SplitText);

/**
 * A marketing page's opening, animated with GSAP: the words of the h1 inside
 * rise from under each line, then the rest of the header fades up after it.
 * "The rest" is anything marked data-hero-after, or, when nothing is marked,
 * every top-level child that doesn't hold the h1.
 *
 * It wraps server-rendered children, so a page keeps its markup and stays a
 * server component. Hidden until GSAP has split the words, so they don't
 * flash in place first; shown straight away for reduced motion or without
 * script.
 */
export function HeroReveal({ children, className, as: Tag = "header" }: { children: ReactNode; className?: string; as?: "header" | "div" | "section" }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const hero = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(hero, { autoAlpha: 1 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(hero, { autoAlpha: 1 });
        const h1 = hero.querySelector("h1");
        const marked = hero.querySelectorAll("[data-hero-after]");
        const after = marked.length ? Array.from(marked) : Array.from(hero.children).filter((el) => !el.contains(h1) && el.tagName !== "STYLE");
        if (!h1) {
          gsap.from(after, { autoAlpha: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.1 });
          return;
        }
        SplitText.create(h1, {
          type: "words,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            const tl = gsap.timeline().from(self.words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.07 });
            if (after.length) tl.from(after, { autoAlpha: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.1 }, "-=0.65");
            return tl;
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <>
      <noscript>
        <style>{"[data-hero-reveal]{visibility:visible!important}"}</style>
      </noscript>
      {/* @ts-expect-error -- the ref fits each of the three tags it can be */}
      <Tag ref={root} data-hero-reveal className={cn("invisible", className)}>
        {children}
      </Tag>
    </>
  );
}
