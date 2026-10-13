"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon as ArrowRightIcon,
  Bookmark02Icon,
  ChromeIcon,
  GithubIcon,
  InstagramIcon,
  Linkedin01Icon,
  NewTwitterIcon,
  Notion01Icon,
  RedditIcon,
  SlackIcon,
  TelegramIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { cn } from "@/lib/utils";

// What Savedly connects to, as a board of tiles seen at an angle, sliding
// past in rows with Savedly fixed in the middle.
//
// The tiles are the connectors on the app's own Integrations page
// (app/(platfrom)/app/integrations), with the same badges: a round, brand-
// colored disc and a white icon, and Google's own "G". Two connect today;
// the rest are planned, drawn fainter, as that page marks them.

type Kind = "live" | "planned";

interface Tile {
  name: string;
  kind: Kind;
  /** A brand icon on a disc of `badge`, or Google's own mark. */
  icon: IconSvgElement | "google";
  /** The disc's color and the icon's, as on the Integrations page. */
  badge: string;
}

/** Official Google "G" mark, as on the Integrations page. */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C39.9 36.9 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

const T = {
  googleCalendar: { name: "Google Calendar", kind: "live", icon: "google", badge: "bg-white ring-1 ring-black/10" },
  github: { name: "GitHub stars", kind: "live", icon: GithubIcon, badge: "bg-neutral-900 text-white dark:ring-1 dark:ring-white/15" },
  notion: { name: "Notion", kind: "planned", icon: Notion01Icon, badge: "bg-foreground text-background" },
  raindrop: { name: "Raindrop.io", kind: "planned", icon: Bookmark02Icon, badge: "bg-sky-500 text-white" },
  reddit: { name: "Reddit", kind: "planned", icon: RedditIcon, badge: "bg-orange-600 text-white" },
  youtube: { name: "YouTube", kind: "planned", icon: YoutubeIcon, badge: "bg-red-600 text-white" },
  x: { name: "X (Twitter)", kind: "planned", icon: NewTwitterIcon, badge: "bg-neutral-900 text-white dark:ring-1 dark:ring-white/15" },
  instagram: { name: "Instagram", kind: "planned", icon: InstagramIcon, badge: "bg-pink-600 text-white" },
  linkedin: { name: "LinkedIn", kind: "planned", icon: Linkedin01Icon, badge: "bg-sky-700 text-white" },
  telegram: { name: "Telegram", kind: "planned", icon: TelegramIcon, badge: "bg-sky-500 text-white" },
  whatsapp: { name: "WhatsApp", kind: "planned", icon: WhatsappIcon, badge: "bg-emerald-500 text-white" },
  slack: { name: "Slack", kind: "planned", icon: SlackIcon, badge: "bg-purple-700 text-white" },
  extension: { name: "Browser extension", kind: "planned", icon: ChromeIcon, badge: "bg-amber-500 text-white" },
} satisfies Record<string, Tile>;

// Three rows that slide past. The top and bottom rows cross the whole board
// in opposite directions; the middle row is two halves that flow in toward
// Savedly from either side and fade out as they reach it. Every row has both
// kinds of tile, so what works today is always somewhere on screen.
const TOP: Tile[] = [T.googleCalendar, T.notion, T.reddit, T.github, T.youtube, T.x, T.instagram, T.linkedin];
const BOTTOM: Tile[] = [T.telegram, T.github, T.whatsapp, T.slack, T.googleCalendar, T.extension, T.raindrop, T.notion];
const MIDDLE_LEFT: Tile[] = [T.github, T.raindrop, T.slack, T.googleCalendar];
const MIDDLE_RIGHT: Tile[] = [T.googleCalendar, T.youtube, T.github, T.whatsapp];

const KIND_LABEL: Record<Kind, string> = { live: "connects today", planned: "planned" };

function BrandTile({ tile, hidden }: { tile: Tile; hidden?: boolean }) {
  const planned = tile.kind === "planned";
  return (
    <li
      aria-hidden={hidden}
      title={`${tile.name}: ${KIND_LABEL[tile.kind]}`}
      className={cn(
        "flex h-[76px] w-[84px] shrink-0 items-center justify-center rounded-2xl ring-1 sm:h-[108px] sm:w-[120px] sm:rounded-3xl",
        planned ? "bg-foreground/[0.02] ring-foreground/[0.06]" : "bg-card shadow-sm ring-foreground/10",
      )}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center overflow-hidden rounded-full sm:h-14 sm:w-14", tile.badge, planned && "opacity-45")}>
        {tile.icon === "google" ? <GoogleLogo className="h-6 w-6 sm:h-8 sm:w-8" /> : <HugeiconsIcon icon={tile.icon} strokeWidth={2} className="h-5 w-5 sm:h-7 sm:w-7" />}
      </span>
      {!hidden && (
        <span className="sr-only">
          {tile.name}, {KIND_LABEL[tile.kind]}
        </span>
      )}
    </li>
  );
}

/** Fades a row out toward one or both ends, so tiles arrive and leave softly. */
const FADE = {
  both: "linear-gradient(to right, transparent 0%, #000 16%, #000 84%, transparent 100%)",
  // The middle row's halves: soft at the outer end, gone before they reach Savedly.
  left: "linear-gradient(to right, transparent 0%, #000 34%, #000 62%, transparent 96%)",
  right: "linear-gradient(to left, transparent 0%, #000 34%, #000 62%, transparent 96%)",
} as const;

/** A row of tiles, written out twice end to end so it can loop without a seam. */
function MarqueeRow({ tiles, seconds, reverse, fade, className }: { tiles: Tile[]; seconds: number; reverse?: boolean; fade: keyof typeof FADE; className?: string }) {
  const list = "connect-marquee flex shrink-0 gap-3 pr-3 sm:gap-6 sm:pr-6";
  const style = { animationDuration: `${seconds}s`, animationDirection: reverse ? ("reverse" as const) : ("normal" as const) };
  return (
    <div className={cn("overflow-hidden", className)} style={{ maskImage: FADE[fade], WebkitMaskImage: FADE[fade] }}>
      <div className="flex w-max">
        <ul className={list} style={style}>
          {tiles.map((tile, i) => (
            <BrandTile key={`${tile.name}-${i}`} tile={tile} />
          ))}
        </ul>
        <ul aria-hidden className={list} style={style}>
          {tiles.map((tile, i) => (
            <BrandTile key={`${tile.name}-${i}`} tile={tile} hidden />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Board() {
  return (
    <div className="group relative mx-auto h-[250px] w-full max-w-[1080px] select-none sm:h-[380px]" style={{ perspective: "1400px" }}>
      {/* Each list slides left by its own width, then starts again: its twin
          has taken its place by then, so the row never jumps. Under the
          pointer the rows stop, so a tile can be read. */}
      <style>{`
        @keyframes connect-marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        .connect-marquee { animation: connect-marquee linear infinite; }
        .group:hover .connect-marquee { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .connect-marquee { animation: none; } }
      `}</style>

      {/* The plane the tiles lie on: tipped back. Under the pointer it stands up to face you. */}
      <div className="absolute inset-x-0 top-0 flex flex-col gap-4 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:rotateX(44deg)] group-hover:[transform:rotateX(0deg)] motion-reduce:transition-none sm:gap-6">
        <MarqueeRow tiles={TOP} seconds={64} fade="both" />

        {/* Savedly has its own place in the middle row. The tiles either side
            flow toward it and fade before they arrive, so nothing is ever
            half hidden behind it. */}
        <div className="flex items-center gap-3 sm:gap-6">
          <MarqueeRow tiles={MIDDLE_LEFT} seconds={38} reverse fade="left" className="min-w-0 flex-1" />
          <div className="flex h-[76px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-card shadow-xl shadow-primary/25 ring-1 ring-primary/50 sm:h-[108px] sm:w-[120px] sm:rounded-3xl">
            <LogoMark ticks={false} className="h-10 w-10 sm:h-14 sm:w-14" />
            <span className="sr-only">Savedly</span>
          </div>
          <MarqueeRow tiles={MIDDLE_RIGHT} seconds={38} fade="right" className="min-w-0 flex-1" />
        </div>

        <MarqueeRow tiles={BOTTOM} seconds={64} reverse fade="both" />
      </div>
    </div>
  );
}

export function ConnectSection() {
  const cta = useAuthCta();
  return (
    <section id="integrations" className="scroll-mt-24 overflow-hidden bg-background px-5 py-20 font-sans antialiased sm:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <Board />

        <div className="mx-auto mt-6 max-w-2xl text-center sm:mt-8">
          <h2 className="font-serif text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">
            Works with the tools
            <br className="hidden sm:block" /> you already use
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            Google Calendar and GitHub connect today. Notion, Raindrop, the browser extension and more are on the way.
          </p>

          <Link
            href={cta.href}
            className="group mt-8 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-6 text-[15px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {cta.isAuthenticated ? cta.label : "Get started"}
            <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <p className="mt-6 text-xs text-muted-foreground">The brighter tiles work today. The fainter ones are planned.</p>
        </div>
      </div>
    </section>
  );
}
