"use client";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { AskPreviewCard } from "@/components/marketing/landing/ask-preview-card";
import { GraphPreviewCard } from "@/components/marketing/landing/graph-preview-card";
import { VaultDemoCard } from "@/components/marketing/landing/vault-demo-card";

// Same three real features/visuals as features-alternating.tsx (the
// version this replaces on the homepage) — Ask, Graph, and Vault, two of
// them genuinely live (try dragging the graph or switching tabs on the
// vault card), one a frozen frame built from real UI primitives. Only the
// layout mechanism changed: sticky-scrolling reveal instead of alternating
// fade-in rows.
const content = [
  {
    title: "Ask, with receipts",
    description:
      "Every answer points back to the memory it came from — ask in plain English, get something you can actually check, not just a confident guess.",
    content: (
      <div className="flex h-full w-full items-center justify-center p-4">
        <AskPreviewCard className="max-w-none" />
      </div>
    ),
  },
  {
    title: "Your library has a shape",
    description:
      "Related by meaning, by tag, or by the collection you put it in — drag it around, click a memory, see what it actually connects to.",
    content: <GraphPreviewCard className="relative h-full w-full overflow-hidden" showLegend={false} />,
  },
  {
    title: "A real lock, not a toggle",
    description:
      "A PIN-protected space inside your library. Switch tabs and come back — the demo below is live, not a screenshot of one.",
    content: (
      <div className="flex h-full w-full items-center justify-center p-4">
        <VaultDemoCard className="max-w-none" />
      </div>
    ),
  },
];

export function StickyFeaturesSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">What it actually does</span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          A few things worth trying, not just reading about.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Everything here is the real thing — scaled down, not screenshotted.
        </p>
      </div>

      <StickyScroll content={content} />
    </section>
  );
}

export default StickyFeaturesSection;
