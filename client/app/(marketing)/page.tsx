import { HeroProduct } from "@/components/marketing/landing/hero-product";
import { ManifestoSection } from "@/components/marketing/landing/manifesto-section";
import { PipelineSection } from "@/components/marketing/landing/pipeline-section";
import { FeatureRowsSection } from "@/components/marketing/landing/feature-rows-section";
import { ContributeSection } from "@/components/marketing/landing/contribute-section";
import { FaqSection } from "@/components/marketing/landing/faq-section";
import { FinalCtaSection } from "@/components/marketing/landing/final-cta-section";
import MainFooter from "@/components/marketing/landing/main-footer";

/**
 * The product proves itself: the hero opens on the real app in a window
 * (screenshots in public/landing/, demo library in public/landing/demo/),
 * a short argument follows, then each capability shown working.
 *
 * Earlier layouts are kept as unused alternates: hero-stacked.tsx (full-bleed
 * salt-flat art), features-grid-cards.tsx (9-card grid), and the sticky and
 * alternating feature sections. The full anchored breakdown lives on /features.
 */
export default function MarketingPage() {
  return (
    <>
      <HeroProduct />
      <ManifestoSection />
      <PipelineSection />
      <FeatureRowsSection />
      <ContributeSection />
      <FaqSection />
      <FinalCtaSection />
      <MainFooter />
    </>
  );
}
