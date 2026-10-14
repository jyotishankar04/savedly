import type { ReactNode } from "react";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";

/** The comparison pages' opening: a large line that rises in (GSAP, through HeroReveal), then whatever follows it. */
export function CompareHero({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <HeroReveal className="px-5 pt-40 pb-12 text-center sm:px-8 md:pt-48">
      <h1 className="text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">{title}</h1>
      {children}
    </HeroReveal>
  );
}
