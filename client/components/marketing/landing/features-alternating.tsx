"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { AskPreviewCard } from "@/components/marketing/landing/ask-preview-card";
import { GraphPreviewCard } from "@/components/marketing/landing/graph-preview-card";
import { VaultDemoCard } from "@/components/marketing/landing/vault-demo-card";
import { cn } from "@/lib/utils";

const SPRING = {
  bounce: 0.1,
  duration: 0.25,
  type: "spring" as const,
};

// The reference's three visual slots are <img src={getImageKitUrl(...)}>
// — SmoothUI's own hosted portraits/product screenshots, via a package
// (@smoothui/data) this repo doesn't have. None of that carries over: no
// stock photos, no screenshots of anything. Two of these three visuals are
// the actual live product pieces used elsewhere on this site (the real
// graph canvas, the real window-blur/tab-lock vault demo — try alt-tabbing
// or switching tabs on either), not pictures of them; the third is a
// frozen frame built from the same UI primitives the real Ask page uses.
const features = [
  {
    title: "Ask, with receipts",
    description:
      "Every answer points back to the memory it came from — ask in plain English, get something you can actually check, not just a confident guess.",
    render: () => <AskPreviewCard />,
  },
  {
    title: "Your library has a shape",
    description:
      "Related by meaning, by tag, or by the collection you put it in — drag it around, click a memory, see what it actually connects to.",
    render: () => <GraphPreviewCard className="relative h-[320px] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card" showLegend={false} />,
  },
  {
    title: "A real lock, not a toggle",
    description:
      "A PIN-protected space inside your library. Try switching tabs and coming back — the vault below is live, not a screenshot of one.",
    render: () => <VaultDemoCard />,
  },
];

export function FeaturesAlternating() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="features-alternating-heading" className="mx-auto w-full max-w-5xl px-6 md:px-12">
      <div className="py-24 md:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">What it actually does</span>
          <h2
            id="features-alternating-heading"
            className="mt-3 text-balance text-3xl font-normal tracking-tight text-foreground md:text-5xl"
          >
            A few things worth trying, not just reading about.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything here is the real thing — scaled down, not screenshotted.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => {
            const isReversed = index % 2 === 1;
            const slideDirection = isReversed ? 24 : -24;

            return (
              <div
                key={feature.title}
                className={cn("grid items-center gap-12 md:grid-cols-2", isReversed && "md:[direction:rtl]")}
              >
                <motion.div
                  className="md:[direction:ltr]"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: slideDirection }}
                  transition={shouldReduceMotion ? { duration: 0 } : SPRING}
                  viewport={{ margin: "-100px", once: true }}
                  whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                >
                  <h3 className="mb-4 text-2xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-lg leading-relaxed text-muted-foreground">{feature.description}</p>
                </motion.div>

                <motion.div
                  className="flex justify-center md:[direction:ltr]"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -slideDirection }}
                  transition={shouldReduceMotion ? { duration: 0 } : SPRING}
                  viewport={{ margin: "-100px", once: true }}
                  whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                >
                  {feature.render()}
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 flex justify-center">
          <Link
            href="/features"
            className="group flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            See everything it does
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturesAlternating;
