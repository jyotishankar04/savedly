"use client";

import { SELF_HOSTED } from "@/lib/instance";
import { PlainFooter } from "@/components/self-hosted/plain-chrome";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoonIcon as Moon,
  Sun01Icon as Sun,
  ComputerIcon as System,
  Calendar01Icon as Calendar,
  GithubIcon as Github,
  Coffee01Icon as Coffee,
  ArrowUpRight01Icon as ArrowUpRight,
} from "@hugeicons/core-free-icons";
import { Logo, LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { BOOKING_URL } from "@/lib/booking";
import { GITHUB_CONFIGURED, GITHUB_URL, LICENSE } from "@/lib/open-source";

// Structure adapted from a pasted "Footer12" reference — kept: the
// asymmetric two-column grid (a lead block beside 4 link columns), the
// stagger/rise motion choreography, the giant brand wordmark bleeding off
// the bottom, a working theme toggle. Dropped rather than faked:
//
// - The newsletter signup form: no subscribe endpoint exists anywhere in
//   this codebase (checked lib/ and app/) — a form that silently does
//   nothing on submit is worse than no form. Its slot instead holds the
//   same brand blurb the previous footer used.
// - Social icons (Facebook/X/Instagram/LinkedIn) and react-icons: no real
//   account for any of them exists anywhere in this codebase (checked) —
//   four icons linking to "#" would be worse than none.
// - The language selector: this app has no i18n/locale switching anywhere,
//   so a working dropdown isn't possible and a decorative one that does
//   nothing would be misleading.
// - The theme toggle is real, not decorative — wired to next-themes'
//   useTheme(), same hook the navbar's own toggle uses.
//
// Colour: an earlier pass used bg-foreground/text-background (inverted —
// a dark band on the light theme, a light band on the dark theme) to echo
// the reference's committed-dark look. That made this the one section on
// the page using the opposite token direction from everywhere else, which
// reads as "off" rather than "on brand" — every other section here is
// plain bg-background/bg-card with text-foreground/text-muted-foreground,
// so this now follows that same direction: a normal part of the page,
// flipping with light/dark exactly like the sections above it, not a
// contrasting band.
interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const sections: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Report a bug", href: "/report" },
    ],
  },
  {
    title: "Compare",
    links: [
      { label: "vs Raindrop", href: "/vs/raindrop" },
      { label: "vs Notion", href: "/vs/notion" },
      { label: "vs Evernote", href: "/vs/evernote" },
      { label: "View all", href: "/vs" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "/help" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Contribute", href: "/contribute" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Security", href: "/security" },
    ],
  },
];

const footerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.08, staggerChildren: 0.1 } },
};

const riseItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", duration: 0.65, bounce: 0 } },
};

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: System },
] as const;

const linkClass =
  "text-[15px] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline underline-offset-4";

/**
 * A rounded panel inset from the page edges, the same shape language as the
 * landing page's panels and blue CTA block, so the page ends on a surface
 * rather than a hairline. Everything linked here exists; nothing is
 * decorative (no newsletter or social icons, since neither exists).
 */
export function MainFooter() {
  return SELF_HOSTED ? <PlainFooter /> : <MarketingFooter />;
}

function MarketingFooter() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Must start false on both server and first client render (mount flag
  // avoids a hydration mismatch against next-themes' resolved theme);
  // flipped true only after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <footer className="w-full overflow-hidden bg-background px-5 pb-5 font-sans text-foreground antialiased sm:px-6 sm:pb-6">
      <motion.div
        variants={footerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-foreground/[0.035] px-6 pt-12 pb-8 ring-1 ring-foreground/8 sm:px-10 sm:pt-16 lg:px-14"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-20">
          <motion.div variants={riseItem} className="max-w-sm">
            <Link href="/" className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <Logo className="text-xl text-foreground" />
            </Link>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Save anything. Ask it anything. A personal library that reads what you save and finds it again when you need it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {GITHUB_CONFIGURED && (
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  <HugeiconsIcon icon={Github} strokeWidth={2} className="h-4 w-4" />
                  GitHub
                </a>
              )}
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5"
              >
                <HugeiconsIcon icon={Calendar} strokeWidth={2} className="h-4 w-4" />
                Book a call
              </a>
              <Link
                href="/contribute"
                className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5"
              >
                <HugeiconsIcon icon={Coffee} strokeWidth={2} className="h-4 w-4" />
                Support the project
              </Link>
            </div>
          </motion.div>

          <motion.nav variants={footerContainer} aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:grid-cols-5">
            {sections.map((section) => (
              <motion.div key={section.title} variants={riseItem}>
                <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className={cn(linkClass, "inline-flex items-center gap-1")}>
                          {link.label}
                          <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-3.5 w-3.5 opacity-60" />
                        </a>
                      ) : (
                        <Link href={link.href} className={linkClass}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.nav>
        </div>

        {/* The mark and wordmark as one large sign-off, auto-fit to the
            panel's width via textLength so the long name never wraps. */}
        <motion.div variants={riseItem} className="pointer-events-none mt-16 flex items-end gap-[2.5%] select-none" aria-hidden>
          <LogoMark className="h-auto w-[11%] shrink-0 opacity-90" />
          <svg className="h-auto min-w-0 flex-1" viewBox="0 0 1000 150" preserveAspectRatio="xMinYMax meet">
            <text x="0" y="128" textLength="1000" lengthAdjust="spacingAndGlyphs" fontSize="160" className="fill-foreground/[0.09] font-sans font-semibold tracking-tight">
              savedly
            </text>
          </svg>
        </motion.div>

        <motion.div variants={riseItem} className="mt-10 flex flex-col gap-5 border-t border-foreground/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Savedly · Free and open source under the {LICENSE} license · Made in Bengaluru
          </p>

          <div role="radiogroup" aria-label="Theme" className="flex h-9 w-fit items-center rounded-full bg-foreground/[0.06] p-1">
            {THEMES.map((t) => {
              const selected = current === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex h-full items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    selected ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={t.icon} strokeWidth={2} className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}

export default MainFooter;
