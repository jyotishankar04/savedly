import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlarmClockIcon,
  ArrowUpRight01Icon,
  BookmarkAdd01Icon,
  Camera01Icon,
  ChromeIcon,
  CursorPointer01Icon,
  HighlighterIcon,
  Search01Icon,
  SidebarRightIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { FinalCtaSection } from "@/components/marketing/landing/final-cta-section";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal, RevealList } from "@/components/marketing/motion/reveal";
import { BrowserShot, FeatureShowcase, Shot, type ShowcaseFeature } from "@/components/marketing/extension/feature-showcase";
import { LoopGallery, type Loop } from "@/components/marketing/extension/loop-gallery";
import { CHROME_WEB_STORE_URL } from "@/lib/extension";
import { GITHUB_URL } from "@/lib/open-source";

export const metadata: Metadata = {
  title: "Chrome extension · Savedly",
  description: "Save any page in one click, highlight what matters, keep Savedly open beside the page, and find things again from the address bar. What the Savedly extension for Chrome does, and what it can see.",
  alternates: { canonical: "/chrome-extension" },
};

// What the extension (extension/ in this repo) does, as it works in version
// 1.2. The pictures are screenshots of the real extension (the same ones its
// welcome tour uses, extension/src/welcome/shots). Shortcuts are Chrome's
// defaults from extension/public/manifest.json; people can change them.

const H2 = "font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground";
const KBD = "inline-grid h-7 min-w-7 place-items-center rounded-md border border-b-2 border-foreground/15 bg-card px-2 font-mono text-[12px] font-semibold text-foreground";

const icon = (svg: typeof ChromeIcon) => <HugeiconsIcon icon={svg} strokeWidth={2} />;

const FEATURES: ShowcaseFeature[] = [
  {
    title: "Save in one click",
    icon: icon(BookmarkAdd01Icon),
    description: "Click the Savedly icon on any page. Add a note or tags if you like, or just save: Savedly reads the page and writes a short summary for you.",
    visual: <Shot src="/extension/save.webp" width={640} height={1200} alt="The Savedly popup ready to save a page, with its cover, a note, collections and tags" />,
  },
  {
    title: "Suggestions as you save",
    icon: icon(SparklesIcon),
    description: "A collection and tags suggested for the page, your recent collections one tap away, and a choice of which picture shows on the card. Nothing is applied until you tap it.",
    visual: <Shot src="/extension/suggest.webp" width={640} height={856} alt="Cover choices, a suggested collection, tags and recent collections in the popup" />,
  },
  {
    title: "Highlight what matters",
    icon: icon(HighlighterIcon),
    description: "Select text on any page and pick a colour, or add a note. Your highlights are there again when you come back to the page, and you can search them in Savedly.",
    visual: <BrowserShot src="/extension/highlight.webp" width={1520} height={596} url="savedly.app/blog/building-savedly-second-brain" alt="A passage highlighted in yellow and the Savedly highlight toolbar above a selection" />,
  },
  {
    title: "Savedly beside the page",
    icon: icon(SidebarRightIcon),
    description: "The side panel shows what Savedly knows about the page you're on and its highlights, with your Inbox, search, recent saves and collections. It follows you from tab to tab.",
    visual: <Shot src="/extension/sidepanel.webp" width={760} height={1230} alt="The Savedly side panel showing the current page, its summary, Inbox, Remind me and highlights" />,
  },
  {
    title: "Screenshot part of a page",
    icon: icon(Camera01Icon),
    description: "Drag over the part you want, or capture everything you can see. Savedly keeps the text in that area too, so screenshots turn up when you search.",
    visual: <BrowserShot src="/extension/region.webp" width={1640} height={840} url="savedly.app/blog/find-it-by-what-you-remember" alt="Dragging a box over part of a page to screenshot it" />,
  },
  {
    title: "Find it by what you remember",
    icon: icon(Search01Icon),
    description: "Search your library from the popup or the side panel, or type sv and a space in the address bar. A ✓ on the Savedly icon means you've already saved the page you're on.",
    visual: <Shot src="/extension/search.webp" width={640} height={660} alt="Searching your library from the Savedly popup" />,
  },
  {
    title: "Read later, or be reminded",
    icon: icon(AlarmClockIcon),
    description: "Links, videos and documents you save wait in your Inbox until you've read them. Pick a time with Remind me and Savedly brings one back with a notification.",
    visual: <Shot src="/extension/saved.webp" width={640} height={1172} alt="A saved page in the popup: what Savedly understood, In your Inbox, Remind me and highlights" />,
  },
  {
    title: "A button on every page",
    icon: icon(CursorPointer01Icon),
    description: "The Savedly button sits at the edge of the page for quick saves, screenshots and the side panel. Drag it wherever suits you, or hide it from the popup.",
    visual: <Shot src="/extension/floating.webp" width={500} height={540} alt="The floating Savedly button with its menu open" />,
  },
];

/** Short looping recordings of the real extension (like the What's new cards), each with a still for reduced motion. */
const LOOPS: Loop[] = [
  { src: "save", title: "Save a page", text: "Click the Savedly icon, take a suggestion, add a note, and save." },
  { src: "highlight", title: "Highlight a passage", text: "Select text, pick a colour, add a note. It's there when you come back." },
  { src: "panel", title: "Open the side panel", text: "Ctrl+Shift+E puts this page, search and your collections beside what you're reading." },
  { src: "find", title: "Find it again", text: "Search your library from the popup; results appear as you type." },
];

const SEES: { what: string; when: string; detail: string }[] = [
  {
    what: "The pages you browse",
    when: "Never sent",
    detail: "To put a ✓ on pages you've already saved, the extension compares short fingerprints of their addresses on your computer. Where you go isn't sent anywhere.",
  },
  {
    what: "The page you act on",
    when: "When you save, highlight or open Savedly on it",
    detail: "Its address and title, and what you chose: a note, tags, a highlight, a screenshot. It goes to your library and nowhere else.",
  },
  {
    what: "Pages you've highlighted",
    when: "When you go back to one",
    detail: "It asks Savedly for that page's highlights, so it can draw them again.",
  },
  {
    what: "Your sign-in",
    when: "Never stored",
    detail: "It uses the sign-in you already have on savedly.app, through the browser. It keeps no password and no token of its own.",
  },
];

export default function ChromeExtensionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1">
        <HeroReveal className="px-5 pt-36 sm:px-8 md:pt-44">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-balance text-foreground">
              Savedly,
              <br className="hidden sm:block" /> right in Chrome
            </h1>
            <div data-hero-after className="lg:justify-self-end">
              <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                Save any page in one click, highlight what matters, keep Savedly open beside what you&apos;re reading, and find it all again from the address bar.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                <a
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={ChromeIcon} strokeWidth={2} className="size-4" />
                  Add to Chrome, free
                </a>
                <Link href="/help/docs/get-started/extension" className="inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground">
                  How to use it
                </Link>
              </div>
            </div>
          </div>

          {/* The extension on a page: a highlight on the left, the save form over it on the right. */}
          <div data-hero-after className="relative mx-auto mt-14 max-w-6xl md:mt-20">
            <div className="relative overflow-hidden rounded-[2rem] bg-muted/70 px-4 pt-6 pb-0 ring-1 ring-foreground/[0.06] sm:px-10 sm:pt-12 md:rounded-[2.5rem]">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_80%_at_10%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_60%),radial-gradient(70%_70%_at_100%_100%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_55%)]" />
              <div className="relative grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
                <div className="overflow-hidden rounded-t-xl bg-white shadow-[0_30px_70px_-24px_rgba(20,40,120,0.35)] ring-1 ring-black/[0.06]">
                  <div className="flex h-9 items-center gap-3 border-b border-black/[0.06] bg-[#f1f2f6] px-3.5">
                    <span className="flex gap-1.5" aria-hidden>
                      <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
                      <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
                      <span className="size-2.5 rounded-full bg-[#d7d9e0]" />
                    </span>
                    <span className="flex h-6 flex-1 items-center truncate rounded-full bg-white px-3 text-xs text-[#6b6f7b]">savedly.app/blog/building-savedly-second-brain</span>
                  </div>
                  <Image src="/extension/highlight.webp" width={760} height={298} priority alt="A page with a passage highlighted using the Savedly extension" className="block h-auto w-full" />
                </div>
                <Image
                  src="/extension/save.webp"
                  width={320}
                  height={600}
                  priority
                  alt="The Savedly popup ready to save the page"
                  className="mx-auto hidden h-auto w-full max-w-[17rem] rounded-t-2xl bg-white shadow-[0_30px_70px_-24px_rgba(20,40,120,0.4)] ring-1 ring-black/[0.06] md:block"
                />
              </div>
            </div>
          </div>
        </HeroReveal>

        {/* 1. What it does */}
        <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className={H2}>Everything, where you&apos;re reading</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">You don&apos;t have to leave the page to keep it, mark it up, or find something you saved last month.</p>
            </Reveal>
            <Reveal className="mt-12" delay={0.1}>
              <FeatureShowcase features={FEATURES} />
            </Reveal>
          </div>
        </section>

        {/* 2. See it work */}
        <section id="watch" className="scroll-mt-24 px-5 pb-20 sm:px-8 md:pb-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className={H2}>See it work</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">The extension in use, a few seconds each. Click one to watch it large.</p>
            </Reveal>
            <Reveal className="mt-12" delay={0.1}>
              <LoopGallery loops={LOOPS} />
            </Reveal>
          </div>
        </section>

        {/* 3. Quick ways in */}
        <section id="shortcuts" className="scroll-mt-24 px-3 py-10 sm:px-5 md:py-16">
          <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-muted/60 px-5 py-16 sm:px-8 md:rounded-[2.5rem] md:py-24">
            <div className="mx-auto max-w-6xl">
              <Reveal>
                <h2 className={H2}>Quicker ways in</h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">For when even opening the popup is one step too many.</p>
              </Reveal>
              <RevealList className="mt-12 grid gap-3 sm:grid-cols-2" gap={0.08}>
                <div className="h-full rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07]">
                  <h3 className="text-base font-medium text-foreground">The right-click menu</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Right-click anywhere and choose Save to Savedly:</p>
                  <ul className="mt-4 grid gap-2 text-[15px] text-foreground">
                    {["Save this page, a link, an image, or the text you selected", "Save to collection: your five most recent, one click away", "Capture a screenshot of an area or the whole page", "Open the Savedly side panel"].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="h-full rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07]">
                  <h3 className="text-base font-medium text-foreground">Keyboard shortcuts</h3>
                  <dl className="mt-4 grid gap-3 text-[15px]">
                    {(
                      [
                        ["Save the page", ["Ctrl", "Shift", "S"]],
                        ["Open the side panel", ["Ctrl", "Shift", "E"]],
                        ["Highlight the selection", ["Alt", "H"]],
                      ] as const
                    ).map(([label, keys]) => (
                      <div key={label} className="flex items-center justify-between gap-4 border-b border-foreground/10 pb-3 last:border-b-0 last:pb-0">
                        <dt className="text-foreground">{label}</dt>
                        <dd className="flex gap-1">
                          {keys.map((k) => (
                            <kbd key={k} className={KBD}>
                              {k}
                            </kbd>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">On a Mac, ⌘ instead of Ctrl and ⌥ instead of Alt. Change them in Chrome&apos;s extension shortcuts.</p>
                </div>
                <div className="h-full rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07]">
                  <h3 className="text-base font-medium text-foreground">From the address bar</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    Type <kbd className={KBD}>sv</kbd> and a space, then what you remember. Matches from your library appear as you type; pick one to open it, or press Enter to see every result in Savedly.
                  </p>
                </div>
                <div className="h-full rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07]">
                  <h3 className="text-base font-medium text-foreground">Already saved?</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    A ✓ on the Savedly icon means the page you&apos;re on is in your library. Click it to see what Savedly made of it, put it in your Inbox, or set a reminder.
                  </p>
                </div>
              </RevealList>
            </div>
          </div>
        </section>

        {/* 4. What it can see */}
        <section id="privacy" className="scroll-mt-24 px-5 py-20 sm:px-8 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
            <Reveal className="max-w-md">
              <h2 className={H2}>What it can see</h2>
              <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
                An extension that runs on every page should say what it does there. This one shows its button and your highlights, and sends nothing until you use it.
              </p>
              <Link href="/privacy" className="mt-7 inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground">
                Read the privacy policy
              </Link>
            </Reveal>

            <RevealList as="dl" className="border-t border-foreground/15" gap={0.06}>
              {SEES.map((item) => (
                <div key={item.what} className="border-b border-foreground/15 py-6">
                  <dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-lg font-medium tracking-[-0.01em] text-foreground">{item.what}</span>
                    <span className="text-xs text-muted-foreground">{item.when}</span>
                  </dt>
                  <dd className="mt-1.5 max-w-lg text-base leading-relaxed text-muted-foreground">{item.detail}</dd>
                </div>
              ))}
            </RevealList>
          </div>
        </section>

        {/* 5. Requirements and self-hosting */}
        <section id="details" className="scroll-mt-24 px-5 pb-20 sm:px-8 md:pb-28">
          <Reveal className="mx-auto grid max-w-6xl gap-10 border-t border-foreground/15 pt-16 md:grid-cols-3 md:gap-12 md:pt-20">
            <div>
              <h3 className="text-lg font-medium text-foreground">Free, with any plan</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">The extension costs nothing. It saves to your Savedly library, on whichever plan you&apos;re on.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Chrome 116 or later</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">Sign in on savedly.app and the extension is signed in too. There&apos;s nothing else to set up.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Running your own Savedly?</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                The Chrome Web Store version talks to savedly.app. For your own server, build it from the{" "}
                <a href={`${GITHUB_URL}/tree/main/extension`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                  source
                  <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-3.5" />
                </a>{" "}
                with your server&apos;s address.
              </p>
            </div>
          </Reveal>
        </section>

        <FinalCtaSection />
      </main>

      <MainFooter />
    </div>
  );
}
