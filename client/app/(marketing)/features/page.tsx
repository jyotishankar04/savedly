"use client";

import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { FeatureOverviewBento } from "@/components/marketing/landing/bento/feature-overview-bento";
import { HowItWorksSection } from "@/components/marketing/landing/how-it-works-section";
import { FormatGridSection } from "@/components/marketing/landing/bento/format-grid-section";
import { AskSection } from "@/components/marketing/landing/ask-section";
import { SearchSection } from "@/components/marketing/landing/search-section";
import { GraphSection } from "@/components/marketing/landing/graph-section";
import { EverywhereSection } from "@/components/marketing/landing/everywhere-section";
import { IntegrationsSection } from "@/components/marketing/landing/integrations-section";
import { VaultSection } from "@/components/marketing/landing/vault-section";
import { SectionAnchor as Anchor } from "@/components/marketing/landing/section-anchor";

// Every section below is the exact same component the homepage uses, not a
// summarized/duplicated version — one source of truth per feature, so a
// future edit to (say) the Ask demo updates both pages at once. This page's
// job is depth and structure (an overview grid that jumps to a full
// section per feature), not new content. The homepage now carries the same
// FeatureOverviewBento + the same anchor ids (see app/(marketing)/page.tsx)
// so its tiles work whichever page they're clicked from.

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background text-foreground font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-8">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Product Features
          </span>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
            Everything you save, <br className="hidden sm:block" /> fully searchable.
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            SaveForLatter is built for researchers, creators, and developers. A personal library that grows smarter over time.
          </p>
        </div>

        <FeatureOverviewBento />

        <Anchor id="how-it-works">
          <HowItWorksSection />
        </Anchor>
        <Anchor id="ask">
          <AskSection />
        </Anchor>
        <Anchor id="search">
          <SearchSection />
        </Anchor>
        <Anchor id="formats">
          <FormatGridSection />
        </Anchor>
        <Anchor id="graph">
          <GraphSection />
        </Anchor>
        <Anchor id="everywhere">
          <EverywhereSection />
        </Anchor>
        <Anchor id="integrations">
          <IntegrationsSection />
        </Anchor>
        <Anchor id="vault">
          <VaultSection />
        </Anchor>
      </main>

      <MainFooter />
    </div>
  );
}
