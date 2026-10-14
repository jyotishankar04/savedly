import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { ChangelogFeed } from "@/components/arc/blocks/changelog-feed/changelog-feed";
import { changelogEntries, changelogMonths } from "@/lib/changelog";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal } from "@/components/marketing/motion/reveal";

// What has shipped, as Arc's changelog feed: filter by kind, open an entry in
// place, jump between months. The entries themselves are in lib/changelog.ts.
export default function ChangelogPage() {
  const latest = changelogEntries[0];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1 px-5 pt-36 pb-20 sm:px-8 md:pt-44 md:pb-28">
        <div className="mx-auto max-w-3xl">
          <HeroReveal className="mb-12">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.04] font-medium tracking-[-0.03em] text-foreground">Changelog</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              What has shipped, newest first. There are no version numbers: Savedly has never had numbered releases, so each entry carries the day it landed.
            </p>
          </HeroReveal>

          <Reveal delay={0.35}>
          <ChangelogFeed
            title="Everything shipped"
            subtitle={latest ? `Latest: ${latest.title}, ${latest.date}` : undefined}
            entries={changelogEntries}
            months={changelogMonths}
            endNote="Before all this came the foundation: saving links, notes, images and documents, collections and tags, and signing in with Google or GitHub."
          />
          </Reveal>
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
