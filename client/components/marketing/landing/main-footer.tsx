"use client";

import { SELF_HOSTED } from "@/lib/instance";
import { PlainFooter } from "@/components/self-hosted/plain-chrome";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  MoonIcon as Moon,
  Sun01Icon as Sun,
  ComputerIcon as System,
  GithubIcon as Github,
  Coffee01Icon as Coffee,
  ArrowUpRight01Icon as ArrowUpRight,
  ArrowRight02Icon as ArrowRight,
  DiscordIcon as Discord,
  Mail01Icon as Mail,
  StarIcon as Star,
  SourceCodeIcon as Code,
  Bug01Icon as Bug,
  GitPullRequestIcon as PullRequest,
  BookOpen01Icon as Book,
} from "@hugeicons/core-free-icons";
import { Logo, LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { GITHUB_CONFIGURED, GITHUB_URL, LICENSE } from "@/lib/open-source";
import { ProductHuntBadge } from "@/components/marketing/product-hunt-badge";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";

/** The community server, the same invite the Community page links to. */
const DISCORD_URL = "https://discord.gg/PzGFcMNyRK";

// What is deliberately not here, because it would be fake:
// - A newsletter form. Nothing in this codebase can subscribe an address, and
//   a form that does nothing on submit is worse than none. The box in its
//   place writes to the support address, which is real.
// - Social accounts that don't exist. GitHub and the Discord server do.
// - People's faces in the orbit. It shows the ways to take part instead.
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
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/#integrations" },
      { label: "Changelog", href: "/changelog" },
      { label: "Self-hosting", href: "/help/docs/self-host/self-host" },
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
      { label: "Report a bug", href: "/report" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
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

/** What circles the logo on the card: the ways to take part, not invented people. */
const ORBIT: { ring: 0 | 1 | 2; angle: number; icon: IconSvgElement; disc: string }[] = [
  { ring: 0, angle: 200, icon: Star, disc: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" },
  { ring: 0, angle: 30, icon: Code, disc: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
  { ring: 1, angle: 300, icon: PullRequest, disc: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" },
  { ring: 1, angle: 120, icon: Bug, disc: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
  { ring: 2, angle: 250, icon: Github, disc: "bg-foreground text-background" },
  { ring: 2, angle: 345, icon: Coffee, disc: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300" },
  { ring: 2, angle: 80, icon: Book, disc: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
];
/** Ring diameters in px, and how long each takes to go round. */
const RINGS = [
  { size: 190, seconds: 70 },
  { size: 330, seconds: 95 },
  { size: 480, seconds: 120 },
];

/**
 * Dashed rings around the logo, each turning slowly with its badges. A badge
 * turns the other way at the same speed, so its icon stays upright.
 */
function Orbit() {
  return (
    <div aria-hidden className="pointer-events-none absolute right-[-120px] top-1/2 hidden h-[480px] w-[480px] -translate-y-1/2 select-none md:block lg:right-[-40px]">
      {RINGS.map((ring, r) => (
        <div
          key={ring.size}
          className="absolute left-1/2 top-1/2 animate-[spin_linear_infinite] rounded-full border border-dashed border-foreground/15 motion-reduce:animate-none"
          style={{ width: ring.size, height: ring.size, marginLeft: -ring.size / 2, marginTop: -ring.size / 2, animationDuration: `${ring.seconds}s`, animationDirection: r % 2 ? "reverse" : "normal" }}
        >
          {ORBIT.filter((o) => o.ring === r).map((o) => (
            <div key={o.angle} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${o.angle}deg) translateX(${ring.size / 2}px) rotate(${-o.angle}deg)` }}>
              <div
                className={cn("-ml-[18px] -mt-[18px] flex h-9 w-9 animate-[spin_linear_infinite] items-center justify-center rounded-full ring-4 ring-card motion-reduce:animate-none", o.disc)}
                style={{ animationDuration: `${ring.seconds}s`, animationDirection: r % 2 ? "normal" : "reverse" }}
              >
                <HugeiconsIcon icon={o.icon} strokeWidth={2} className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10">
        <LogoMark ticks={false} className="h-9 w-9" />
      </div>
    </div>
  );
}

/**
 * Closes every marketing page: a card that asks for the one thing an open
 * source project needs, then the brand, the links and a way to write in,
 * and a slim bottom bar. Everything linked here exists.
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
    <footer className="w-full overflow-hidden bg-gradient-to-b from-background to-muted/70 px-5 font-sans text-foreground antialiased sm:px-8">
      <motion.div
        variants={footerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="mx-auto w-full max-w-6xl pt-10 md:pt-16"
      >
        {/* The card */}
        <motion.div variants={riseItem} className="relative overflow-hidden rounded-[2rem] bg-card px-7 py-12 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)] ring-1 ring-foreground/[0.07] sm:px-12 sm:py-16">
          <Orbit />
          <div className="relative max-w-md">
            <p className="text-sm text-muted-foreground">Open source</p>
            <h2 className="mt-4 text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">Help build Savedly</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Savedly is <strong className="font-semibold text-foreground">free and open source</strong> under {LICENSE}. Star it, report a bug, or send a pull request. Every one of them moves it forward.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {GITHUB_CONFIGURED && (
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Contribute on GitHub
                  <HugeiconsIcon icon={ArrowUpRight} strokeWidth={2} className="h-4 w-4" />
                </a>
              )}
              <Link
                href="/contribute"
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <HugeiconsIcon icon={Coffee} strokeWidth={2} className="h-4 w-4" />
                Support the project
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Brand, links, and a way to write in */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(220px,280px)_1fr_minmax(240px,300px)] lg:gap-14">
          <motion.div variants={riseItem}>
            <Link href="/" className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <Logo className="text-xl text-foreground" />
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted-foreground">A personal library that reads what you save and finds it again when you need it.</p>
            <ProductHuntBadge variant="review" height={36} className="mt-5" />
          </motion.div>

          <motion.nav variants={footerContainer} aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
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

          <motion.div variants={riseItem}>
            <h3 className="text-sm font-medium text-foreground">Get in touch</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Questions, billing, privacy or a bug you can&apos;t pin down. A person reads every message.</p>
            <a
              href={SUPPORT_MAILTO}
              className="group mt-5 flex h-12 items-center gap-2.5 rounded-full bg-card pl-4 pr-1.5 text-sm text-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <HugeiconsIcon icon={Mail} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{SUPPORT_EMAIL}</span>
              <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:translate-x-0.5">
                <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-4 w-4" />
              </span>
            </a>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div variants={riseItem} className="mt-16 flex flex-col gap-5 border-t border-foreground/10 py-7 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Savedly <span className="mx-1.5">·</span> {LICENSE} license <span className="mx-1.5">·</span> Made in Bengaluru
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div role="radiogroup" aria-label="Theme" className="flex h-8 w-fit items-center rounded-full bg-foreground/[0.06] p-1">
              {THEMES.map((t) => {
                const selected = current === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={t.label}
                    title={t.label}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex h-full w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      selected ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={t.icon} strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Savedly on GitHub" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <HugeiconsIcon icon={Github} strokeWidth={2} className="h-[18px] w-[18px]" />
              </a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" aria-label="The Savedly Discord server" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <HugeiconsIcon icon={Discord} strokeWidth={2} className="h-[18px] w-[18px]" />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}

export default MainFooter;
