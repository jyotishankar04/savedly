import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { StepsSection } from "@/components/marketing/landing/steps-section";
import { FeatureBlocks } from "@/components/marketing/landing/feature-blocks";
import { MoreSection } from "@/components/marketing/landing/more-section";
import { ConnectSection } from "@/components/marketing/landing/connect-section";
import { ImportSection } from "@/components/marketing/landing/import-section";
import { PrivacySection } from "@/components/marketing/landing/privacy-section";
import { FinalCtaSection } from "@/components/marketing/landing/final-cta-section";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal } from "@/components/marketing/motion/reveal";

export const metadata: Metadata = {
  title: "Features · Savedly",
  description: "Everything Savedly does: search by meaning, Ask, automatic filing, sharing, a calendar, a vault and integrations.",
};

// The whole product on one page, built from the same sections as the home
// page (one source of truth per feature: an edit to the Ask block shows on
// both). What this page adds is the index at the top, so someone looking for
// one thing can jump to it, and the absence of everything that isn't a
// feature (the hero, pricing, the questions).
//
// Other pages link to anchors here. The sections carry most of them
// (#search, #ask, #organize, #everything, #integrations, #import, #privacy);
// the rest are the empty targets below, kept for links that already exist
// (the navigation's #how-it-works and #formats, and older #graph, #vault and
// #everywhere).

const INDEX: { label: string; href: string; about: string }[] = [
  { label: "How it works", href: "#how-it-works", about: "Capture, understand, find, ask" },
  { label: "Search", href: "#search", about: "By meaning, or the exact words" },
  { label: "Ask", href: "#ask", about: "Answers from what you saved" },
  { label: "Organize", href: "#organize", about: "Filed, tagged and summarized for you" },
  { label: "Share, plan, look back", href: "#everything", about: "Links, a calendar, the graph, the vault" },
  { label: "Integrations", href: "#integrations", about: "Google Calendar, GitHub, and what's planned" },
  { label: "Import", href: "#import", about: "Bring your bookmarks with you" },
  { label: "Privacy", href: "#privacy", about: "What happens to what you save" },
];

/** A place for an existing link to land, just above the section it means. */
function Target({ id }: { id: string }) {
  return <span id={id} aria-hidden className="block scroll-mt-24" />;
}

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1">
        <HeroReveal className="px-5 pt-36 sm:px-8 md:pt-44">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
              <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-balance text-foreground">
                Everything
                <br className="hidden sm:block" /> Savedly does
              </h1>
              <p data-hero-after className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
                Save anything, and find it again from whatever you remember about it. Each part below is shown working, with the same examples all the way down. For what happens behind it, see{" "}
                <Link href="/how-it-works" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                  how it works
                </Link>
                .
              </p>
            </div>

            <nav data-hero-after aria-label="On this page" className="mt-12 grid border-t border-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
              {INDEX.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group border-b border-foreground/15 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:pr-6"
                >
                  <span className="flex items-center justify-between gap-3 text-base font-medium text-foreground">
                    {item.label}
                    <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-y-0.5">
                      ↓
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.about}</span>
                </Link>
              ))}
            </nav>
          </div>
        </HeroReveal>

        <Target id="how-it-works" />
        <Target id="formats" />
        <Reveal>
          <StepsSection />
        </Reveal>

        <Reveal>
          <FeatureBlocks />
        </Reveal>

        <Target id="graph" />
        <Target id="vault" />
        <Target id="everywhere" />
        <Reveal>
          <MoreSection />
        </Reveal>

        <Reveal>
          <ConnectSection />
        </Reveal>
        <Reveal>
          <ImportSection />
        </Reveal>
        <Reveal>
          <PrivacySection />
        </Reveal>
        <FinalCtaSection />
      </main>

      <MainFooter />
    </div>
  );
}
