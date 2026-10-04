"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

// Adapted from @shoogle/uitripled/native-marquee-shadcnui — trimmed to the
// horizontal case only (this section never needs vertical) and ported from
// framer-motion to motion/react, the package already used everywhere else
// in this repo.
//
// The reference's own loop math doesn't actually hold for an arbitrary
// number of clones: it renders `copies` extra instances and animates the
// wrapper by a flat -50%, which is only seamless if the TOTAL instance
// count is even — its `Math.ceil(...) + 1` doesn't guarantee that, so on
// some viewport widths the strip visibly jumps at every loop restart.
// Fixed here by always rendering exactly two blocks (never an odd tail)
// and translating by -50% of the wrapper, which by construction is one
// full block — so the loop always lands back on an identical frame,
// regardless of how many repeats each block needed to fill the container.
interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  gap?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
}

function useMarqueeFit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(1);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    if (!containerRef.current || !itemRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const itemWidth = itemRef.current.getBoundingClientRect().width;
    if (itemWidth === 0) return;
    // How many copies of `children` it takes to at least fill the visible
    // box once — that's one "block"; two identical blocks make the loop.
    setRepeats(Math.max(1, Math.ceil(containerWidth / itemWidth)));
    setReady(true);
  }, []);

  useEffect(() => {
    measure();
    if (!itemRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return { containerRef, itemRef, repeats, ready };
}

function Block({ children, repeats, gap, withRef, hidden }: { children: React.ReactNode; repeats: number; gap: number; withRef?: React.Ref<HTMLDivElement>; hidden?: boolean }) {
  return (
    <div ref={withRef} aria-hidden={hidden} className="flex shrink-0" style={{ gap }}>
      {Array.from({ length: repeats }).map((_, i) => (
        <div key={i} className="flex shrink-0" style={{ gap }}>
          {children}
        </div>
      ))}
    </div>
  );
}

export function Marquee({ children, className, speed = 34, gap = 12, reverse = false, pauseOnHover = true }: MarqueeProps) {
  const { containerRef, itemRef, repeats, ready } = useMarqueeFit();
  const [scope, animate] = useAnimate();
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // An infinite auto-scroll is exactly the motion prefers-reduced-motion
    // exists to stop (WCAG 2.3.3) — skip starting it rather than animate
    // then immediately fight the user's own OS setting.
    if (!ready || !scope.current || reduceMotion) return;
    controlsRef.current = animate(
      scope.current,
      { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] },
      { duration: speed, ease: "linear", repeat: Infinity }
    );
    return () => controlsRef.current?.stop();
  }, [ready, reverse, speed, animate, scope,reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex w-full overflow-hidden", className)}
      onMouseEnter={pauseOnHover ? () => controlsRef.current?.pause() : undefined}
      onMouseLeave={pauseOnHover ? () => controlsRef.current?.play() : undefined}
    >
      <motion.div ref={scope} className="flex w-max shrink-0" style={{ gap }}>
        {/* itemRef measures a single, unrepeated copy of children — the
            unit useMarqueeFit divides the container width by. It's the
            only instance NOT marked aria-hidden; every fill/clone copy
            after it (same content, purely decorative) is hidden from
            assistive tech so the list isn't announced N times over. */}
        <div ref={itemRef} className="flex shrink-0" style={{ gap }}>
          {children}
        </div>
        <Block repeats={Math.max(0, repeats - 1)} gap={gap} hidden>
          {children}
        </Block>
        <Block repeats={repeats} gap={gap} hidden>
          {children}
        </Block>
      </motion.div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24" />
    </div>
  );
}

export default Marquee;
