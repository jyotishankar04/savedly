import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { FinalCtaSection } from "@/components/marketing/landing/final-cta-section";
import { Journey } from "@/components/marketing/how-it-works/journey";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal, RevealList } from "@/components/marketing/motion/reveal";
import { GITHUB_URL, INSTALL_COMMAND, LICENSE } from "@/lib/open-source";

export const metadata: Metadata = {
  title: "How it works · Savedly",
  description: "What happens between pressing Save and finding it again: how Savedly reads, files and indexes what you save, what runs where, and what leaves your server.",
  alternates: { canonical: "/how-it-works" },
};

// The product explained from the inside, for people who want to know what
// happens to what they save: one save followed step by step, what the
// system is made of, and what leaves it. Everything here is how the code
// works today (server/src/modules/ai, docker-compose.yml, the privacy
// policy); nothing planned is described as built.

const H2 = "font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground";

/** What the system is made of, top to bottom in the order a save passes through it. */
const PARTS: { name: string; what: string; detail: string }[][] = [
  [{ name: "You", what: "A browser or a phone", detail: "The website, installed on your phone if you like, or shared to from another app." }],
  [
    { name: "The website", what: "Next.js", detail: "Everything you see. It holds no data of its own." },
    { name: "The API", what: "Express, TypeScript", detail: "Checks who you are on every request, and is the only thing that touches your data." },
  ],
  [
    { name: "The database", what: "Postgres", detail: "Your library: saves, summaries, tags, collections, and the vectors used to search by meaning." },
    { name: "The queue", what: "Redis", detail: "Saves waiting to be read, and a short-lived cache. Nothing permanent lives here." },
    { name: "File storage", what: "Cloudflare R2, or a local disk", detail: "The images and documents you upload." },
  ],
  [
    { name: "The reader", what: "A background worker", detail: "Takes each save off the queue and runs the steps above, four saves at a time." },
    { name: "The AI provider", what: "Ours, or the one you choose", detail: "Receives text to summarize or a question to answer, and returns the result. On the hosted service it isn't used to train models." },
  ],
];

const LEAVES: { to: string; what: string; when: string }[] = [
  { to: "The AI provider", what: "The text of a save, or your question and the passages it draws on", when: "When a save is read, and when you ask something" },
  { to: "Google", what: "The events you add, change or remove", when: "Only if you connect Google Calendar" },
  { to: "GitHub", what: "A request for your list of starred repositories", when: "Only if you connect GitHub" },
  { to: "Our email provider", what: "Your email address and the message", when: "When we email you about your account" },
  { to: "Dodo Payments", what: "Your email address and the plan you chose. Your card details go to them directly and never reach us", when: "Only if you buy a paid plan" },
  { to: "Sentry", what: "An error, where in the code it happened, and your account ID", when: "When something breaks" },
  { to: "Vercel Analytics", what: "A count of visits to public pages like this one. Nothing from inside the app", when: "When you browse the website" },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1">
        <HeroReveal className="px-5 pt-36 sm:px-8 md:pt-44">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-balance text-foreground">
              How Savedly
              <br className="hidden sm:block" /> works
            </h1>
            <p data-hero-after className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
              What happens between pressing Save and finding it again, what the system is made of, and what leaves it. All of it is in the{" "}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                open source code
              </a>
              , so none of it has to be taken on trust.
            </p>
          </div>
        </HeroReveal>

        {/* 1. One save, step by step */}
        <section id="journey" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
            <h2 className={H2}>One save, step by step</h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Follow a single article from the moment it&apos;s saved. The steps run by themselves, in a few seconds, and side by side where they don&apos;t depend on each other.
            </p>
            </Reveal>
            <Reveal className="mt-12" delay={0.1}>
              <Journey />
            </Reveal>
          </div>
        </section>

        {/* 2. What it's made of */}
        <section id="architecture" className="scroll-mt-24 px-3 py-10 sm:px-5 md:py-16">
          <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/60 px-5 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
            <div className="mx-auto max-w-6xl">
              <Reveal>
              <h2 className={H2}>What it&apos;s made of</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">A few parts, each doing one job. A save travels down through them; a search travels back up.</p>

              </Reveal>
              <RevealList className="mt-12 space-y-3" gap={0.1}>
                {PARTS.map((row, r) => (
                  <div key={r}>
                    {r > 0 && (
                      <div aria-hidden className="flex justify-center py-1 text-muted-foreground/60">
                        ↓
                      </div>
                    )}
                    <div className={`grid gap-3 ${row.length === 1 ? "mx-auto max-w-md" : row.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                      {row.map((part) => (
                        <div key={part.name} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/[0.07]">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <h3 className="text-base font-medium text-foreground">{part.name}</h3>
                            <span className="font-mono text-[11px] text-muted-foreground">{part.what}</span>
                          </div>
                          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{part.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </RevealList>

              <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Every request for your data is checked against your account, in the API and again in each tool Ask can use, so one person&apos;s library can&apos;t be reached from another&apos;s.
              </p>
            </div>
          </div>
        </section>

        {/* 3. What leaves */}
        <section id="data" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
            <Reveal className="max-w-md">
              <h2 className={H2}>What leaves the system</h2>
              <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
                These places, and only for the reason beside each one. Nothing is sent to advertisers, and nothing is used to train a model.
              </p>
              <Link href="/privacy" className="mt-7 inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground">
                Read the privacy policy
              </Link>
            </Reveal>

            <RevealList as="dl" className="border-t border-foreground/15" gap={0.06}>
              {LEAVES.map((item) => (
                <div key={item.to} className="border-b border-foreground/15 py-6">
                  <dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-lg font-medium tracking-[-0.01em] text-foreground">{item.to}</span>
                    <span className="text-xs text-muted-foreground">{item.when}</span>
                  </dt>
                  <dd className="mt-1.5 max-w-lg text-base leading-relaxed text-muted-foreground">{item.what}</dd>
                </div>
              ))}
            </RevealList>
          </div>
        </section>

        {/* 4. Run it yourself */}
        <section id="self-host" className="scroll-mt-24 px-5 pb-20 sm:px-8 md:pb-28">
          <div className="mx-auto max-w-6xl border-t border-foreground/15 pt-20 md:pt-28">
            <Reveal className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
              <div>
                <h2 className={H2}>Or run all of it yourself</h2>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                  One command starts the website, the API with its reader, the database and the queue on your own machine. Files go on its disk, and the AI key is yours. It&apos;s the same code, under {LICENSE}, with every
                  feature and no limits.
                </p>
                <Link href="/help/docs/self-host/self-host" className="mt-7 inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground">
                  Read the self-host guide
                </Link>
              </div>
              <div className="self-center rounded-3xl bg-card p-6 ring-1 ring-foreground/[0.07] sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Install</p>
                <p className="mt-3 break-all font-mono text-[12.5px] leading-relaxed text-muted-foreground select-all">
                  <span className="text-primary">$</span> {INSTALL_COMMAND}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <FinalCtaSection />
      </main>

      <MainFooter />
    </div>
  );
}
