"use client";

import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  WhatsappIcon,
  NotionIcon,
  SlackIcon,
  TelegramIcon,
  DiscordIcon,
  Mail01Icon,
  CloudIcon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// Real logos, copied from app/(platfrom)/app/integrations/page.tsx's
// GoogleLogo/MicrosoftLogo — inline SVG, not a hotlinked storage.efferd.com
// image, and not one of the reference's invented connectors (Notion,
// Cursor, Vercel, Planetscale, Supabase, Canva, Adobe, Polar — none of
// which this product integrates with).
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

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

interface Tile {
  row: number;
  col: number;
  // A live connection: full-opacity brand mark, named in its tooltip.
  logo?: React.ComponentType<{ className?: string }>;
  label?: string;
  // A "coming soon" placeholder: named apps the user asked to show here
  // (WhatsApp, Notion, and similar), rendered faded rather than full
  // opacity/color like the two live tiles — the visual grammar already
  // used for disabled/not-yet-shipped states elsewhere on this page
  // (Everywhere section's "Coming soon" badge), so faded here means the
  // same thing it means there: real plan, not live yet.
  futureIcon?: IconSvgElement;
  futureLabel?: string;
  // The hugeicons brand marks are single-path outlines (`stroke:
  // "currentColor"`, checked in the installed package — no baked-in brand
  // colors), not the real multi-colour logos. Tinting via currentColor
  // with each app's actual signature hex, then fading that, gets a
  // correctly-shaped (licensed icon set) AND correctly-coloured result
  // without hand-reconstructing logo paths from memory. Must be a literal
  // class string, not built from a variable — Tailwind's scanner needs
  // the literal text to generate the arbitrary-value utility.
  futureIconClassName?: string;
}

// Same 5x5 scattered layout and cell math as the reference (72px cells,
// radial-mask vignette). Two live tiles (Google, Microsoft) at full
// opacity; the rest are faded "coming soon" marks — named apps where the
// user specified them (WhatsApp, Notion, Slack, Telegram, Discord), a
// couple of generic glyphs for "and more" where a specific name wasn't
// given, and two left genuinely blank so the grid still has room to grow.
const TILES: Tile[] = [
  { row: 0, col: 1, futureIcon: WhatsappIcon, futureLabel: "WhatsApp", futureIconClassName: "text-[#25D366]/45" },
  { row: 0, col: 3, futureIcon: NotionIcon, futureLabel: "Notion", futureIconClassName: "text-[#71717A]/55" },
  { row: 1, col: 0, futureIcon: SlackIcon, futureLabel: "Slack", futureIconClassName: "text-[#4A154B]/45 dark:text-[#ECB22E]/45" },
  { row: 1, col: 2, logo: GoogleLogo, label: "Google Calendar" },
  { row: 1, col: 4, futureIcon: TelegramIcon, futureLabel: "Telegram", futureIconClassName: "text-[#26A5E4]/45" },
  { row: 2, col: 1 },
  { row: 2, col: 3, futureIcon: DiscordIcon, futureLabel: "Discord", futureIconClassName: "text-[#5865F2]/45" },
  { row: 3, col: 0, futureIcon: Mail01Icon },
  { row: 3, col: 2, logo: MicrosoftLogo, label: "Microsoft Outlook" },
  { row: 3, col: 4, futureIcon: CloudIcon },
  { row: 4, col: 1 },
  { row: 4, col: 3, futureIcon: BubbleChatIcon },
];

const CELL = 72;

const leftVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(5px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 26, stiffness: 120 } },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.035, delayChildren: 0.15 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", damping: 22, stiffness: 200 } },
};

function IntegrationTile({ row, col, logo: Logo, label, futureIcon, futureLabel, futureIconClassName }: Tile) {
  return (
    <motion.div
      variants={tileVariants}
      title={label ?? (futureIcon ? `${futureLabel ? `${futureLabel} — ` : ""}Coming soon` : undefined)}
      className={cn(
        "absolute flex size-18 items-center justify-center rounded-md border border-border",
        Logo ? "bg-card shadow-xs dark:bg-card/60" : "bg-secondary/30 dark:bg-background"
      )}
      style={{ left: col * CELL, top: row * CELL }}
    >
      {Logo && <Logo className="pointer-events-none size-8 select-none p-1" />}
      {futureIcon && (
        <HugeiconsIcon
          icon={futureIcon}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cn("pointer-events-none size-6", futureIconClassName ?? "text-muted-foreground/40")}
        />
      )}
    </motion.div>
  );
}

export function IntegrationsSection() {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 overflow-x-hidden px-6 py-24 sm:py-32 md:grid-cols-2 md:px-12">
      {/* The tile grid below is a fixed 360px (5 × 72px cells, matching the
          reference's own math) — narrower than the available width on the
          smallest phones (~327px after this section's own padding).
          overflow-x-hidden above keeps that from becoming page-level
          horizontal scroll; the radial mask already fades the outer tiles
          toward transparent, so the few pixels clipped on the narrowest
          screens are the ones already fading out. */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={leftVariants}
        className="max-w-xl space-y-5"
      >
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Connects where you already work
        </span>
        <h2 className="text-3xl font-normal tracking-tight text-foreground sm:text-4xl md:text-5xl">
          A memory can also be an event.
        </h2>
        <p className="text-lg leading-8 text-muted-foreground">
          When something you save has a date attached, push it straight to Google
          Calendar or Outlook — no copying the details over by hand.
        </p>
        <p className="text-sm font-medium text-muted-foreground">More connections are on the way.</p>
      </motion.div>

      <div className="place-items-center md:place-items-end">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={gridVariants}
          className="relative size-90"
          style={{
            maskImage: "radial-gradient(ellipse at center, black, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black, black, transparent)",
          }}
        >
          {TILES.map((tile) => (
            <IntegrationTile key={`${tile.row}_${tile.col}`} {...tile} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default IntegrationsSection;
