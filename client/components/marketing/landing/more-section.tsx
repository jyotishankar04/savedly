"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Analytics01Icon,
  Calendar03Icon,
  CommandIcon,
  Globe02Icon,
  LockIcon,
  LockPasswordIcon,
  Search01Icon,
  Share08Icon,
  SquareLock02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// Everything the product does that the sections above don't show. Each card
// is a small piece of the real interface, drawn in markup with the demo
// library's content, beside a title and a plain description. Only what is in
// the app today; a planned connector is drawn as planned, and anything tied
// to a paid plan says so.
//
// On a wide screen the section holds still while the page scrolls and the
// cards take turns: picture left and words right, then the reverse, each
// sliding in from its own side. On a phone, or with reduced motion, the same
// cards are simply stacked.

/** The frame every picture sits in. */
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-muted/70 p-6 ring-1 ring-foreground/[0.05]", className)}>
      {children}
    </div>
  );
}

/** A piece of app UI inside a panel. */
function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full max-w-[300px] rounded-xl bg-card p-4 shadow-lg shadow-black/[0.06] ring-1 ring-foreground/[0.07]", className)}>{children}</div>;
}

function SharePicture() {
  const options: { icon: IconSvgElement; label: string; hint: string; on?: boolean }[] = [
    { icon: LockIcon, label: "Restricted", hint: "Only people you invite" },
    { icon: LockPasswordIcon, label: "Password protected", hint: "Link and password" },
    { icon: Globe02Icon, label: "Anyone with the link", hint: "No account needed", on: true },
  ];
  return (
    <Surface>
      <p className="text-[11px] font-semibold text-foreground">Share</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Sourdough starter feeding schedule</p>
      <div className="mt-3 space-y-1.5">
        {options.map((o) => (
          <div key={o.label} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2", o.on ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/60")}>
            <HugeiconsIcon icon={o.icon} strokeWidth={2} className={cn("h-3.5 w-3.5 shrink-0", o.on ? "text-primary" : "text-muted-foreground")} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium leading-tight text-foreground">{o.label}</p>
              <p className="text-[9.5px] leading-tight text-muted-foreground">{o.hint}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} className="h-3 w-3" />
        Viewed 12 times this week
      </div>
    </Surface>
  );
}

function CalendarPicture() {
  const days = [
    ["Mon", "12"],
    ["Tue", "13"],
    ["Wed", "14"],
    ["Thu", "15"],
    ["Fri", "16"],
  ];
  return (
    <Surface>
      <div className="grid grid-cols-5 gap-1 text-center">
        {days.map(([d, n]) => (
          <div key={n}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{d}</p>
            <p className={cn("mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium", n === "13" ? "bg-primary text-primary-foreground" : "text-foreground")}>{n}</p>
            <div className="mt-1.5 h-12 rounded-md bg-muted/60 p-0.5">
              {n === "15" && <div className="rounded bg-primary/15 px-1 py-0.5 text-left text-[8px] font-medium leading-tight text-primary">Dentist 4:30</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-muted/60 p-2.5">
        <p className="text-[10.5px] leading-snug text-foreground">Looks like &ldquo;Priya birthday gift ideas&rdquo; is about an event</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9.5px] font-semibold text-primary-foreground">Add to calendar</span>
          <span className="text-[9.5px] text-muted-foreground">Dismiss</span>
        </div>
      </div>
    </Surface>
  );
}

function GraphPicture() {
  // A few of the demo library's memories, joined where they share a subject.
  const nodes = [
    { x: 60, y: 44, r: 9, c: "fill-amber-400", l: "Sourdough starter" },
    { x: 132, y: 30, r: 7, c: "fill-primary", l: "Hydration, explained" },
    { x: 104, y: 96, r: 8, c: "fill-amber-400", l: "Pottery studios" },
    { x: 196, y: 70, r: 9, c: "fill-amber-400", l: "Lisbon trip plan" },
    { x: 232, y: 128, r: 7, c: "fill-primary", l: "Flight checklist" },
    { x: 44, y: 132, r: 7, c: "fill-amber-400", l: "Gift ideas" },
  ];
  const links = [
    [0, 1],
    [0, 2],
    [2, 5],
    [3, 4],
    [1, 3],
  ];
  return (
    <Surface className="max-w-[320px] p-3">
      <svg viewBox="0 0 280 170" className="h-auto w-full">
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} className="stroke-foreground/15" strokeWidth="1" />
        ))}
        {nodes.map((n) => (
          <g key={n.l}>
            <circle cx={n.x} cy={n.y} r={n.r} className={n.c} />
            <text x={n.x} y={n.y + n.r + 11} textAnchor="middle" className="fill-muted-foreground text-[8.5px]">
              {n.l}
            </text>
          </g>
        ))}
      </svg>
    </Surface>
  );
}

function VaultPicture() {
  return (
    <Surface className="max-w-[240px] text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <HugeiconsIcon icon={SquareLock02Icon} strokeWidth={2} className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-3 text-[13px] font-semibold text-foreground">Vault is locked</p>
      <p className="mt-1 text-[10.5px] text-muted-foreground">Enter your PIN to see what&apos;s inside.</p>
      <div className="mt-3 flex h-8 items-center justify-center gap-2 rounded-full ring-2 ring-primary/40">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < 2 ? "bg-foreground" : "bg-foreground/20")} />
        ))}
      </div>
      <div className="mt-2 h-7 rounded-full bg-primary/60" />
    </Surface>
  );
}

function PalettePicture() {
  const items = [
    ["Save a memory", "Quick action"],
    ["Ask Savedly", "Quick action"],
    ["Go to Collections", "Go to"],
    ["Go to Vault", "Go to"],
  ];
  return (
    <Surface className="p-0">
      <div className="flex items-center gap-2 border-b border-foreground/[0.07] px-3 py-2.5">
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-[11px] text-muted-foreground">Search or jump to...</span>
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Ctrl K</kbd>
      </div>
      <div className="p-1.5">
        {items.map(([label, kind], i) => (
          <div key={label} className={cn("flex items-center justify-between rounded-md px-2 py-1.5", i === 0 && "bg-muted")}>
            <span className="text-[11px] text-foreground">{label}</span>
            <span className="text-[9px] text-muted-foreground">{kind}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

const CARDS: { icon: IconSvgElement; title: string; body: string; picture: ReactNode; href: string }[] = [
  {
    icon: Share08Icon,
    title: "Share a memory, or a whole collection",
    body: "Send a public link, and stop sharing whenever you like. Lite and Pro add password-protected links and daily view counts; Pro adds inviting people by email and letting them request access.",
    picture: <SharePicture />,
    href: "/help/docs/share/share",
  },
  {
    icon: Calendar03Icon,
    title: "Dates turn into a calendar",
    body: "A date in something you save is spotted and offered as an event, in your own time zone. Keep it in Savedly's calendar, sync it with Google Calendar, or add and move events by asking.",
    picture: <CalendarPicture />,
    href: "/help/docs/stay/calendar",
  },
  {
    icon: Analytics01Icon,
    title: "Look back at what you saved",
    body: "A graph shows how your memories connect. Explore brings back something you saved and forgot, and Insights shows what you save and when. Favorites, Archive, and a Trash that waits 15 days.",
    picture: <GraphPicture />,
    href: "/help/docs/find/explore",
  },
  {
    icon: SquareLock02Icon,
    title: "A vault for what nobody else should see",
    body: "On Lite and Pro, move anything into the vault and it opens only with your PIN. Vaulted items stay out of search, Ask and the graph. It blurs when you switch away, and locks when you leave.",
    picture: <VaultPicture />,
    href: "/help/docs/share/vault",
  },
  {
    icon: CommandIcon,
    title: "Quick to get around",
    body: "A command palette and keyboard shortcuts for everything. Install it on your phone with no app store, and share to Savedly from other apps. Light and dark themes, with an accent color of your choosing.",
    picture: <PalettePicture />,
    href: "/help/docs/account/shortcuts",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;
/** How far the page scrolls for each card, in viewport heights. */
const SCROLL_PER_CARD = 0.8;

function Heading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-primary" aria-hidden />
          Beyond search
        </p>
        <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">
          Everything else
          <br className="hidden sm:block" /> it does
        </h2>
      </div>
      <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
        Search, Ask and filing are the heart of it. Around them is the rest of a place to keep things: sharing, a calendar, a vault, and quick ways to get around.
      </p>
    </div>
  );
}

const ALSO =
  "Also: links, notes, images, PDFs, videos and voice memos all save the same way. Bulk actions on many memories at once (Lite and Pro). Self-host with one command and bring your own AI key from OpenAI, Anthropic, Gemini, Groq or OpenRouter, with backups and update notices in the admin area.";

/** One card at a time, changing with the scroll. Wide screens with motion allowed. */
function Stage() {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setActive(Math.min(CARDS.length - 1, Math.max(0, Math.floor(progress * CARDS.length))));
  });

  return (
    <div ref={track} style={{ height: `${100 + CARDS.length * SCROLL_PER_CARD * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="relative mx-auto h-[min(64vh,520px)] w-full max-w-6xl">
          {CARDS.map((card, i) => {
            const shown = i === active;
            // Even cards: picture left, words right. Odd cards: the reverse.
            const pictureLeft = i % 2 === 0;
            // Each half arrives from, and leaves toward, its own outer edge.
            const off = (side: "left" | "right") => (side === "left" ? -72 : 72);
            return (
              <article
                key={card.title}
                aria-hidden={!shown}
                className={cn("absolute inset-0 grid grid-cols-2 items-center gap-16", !shown && "pointer-events-none")}
              >
                <motion.div
                  className={cn(pictureLeft ? "order-1" : "order-2")}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : off(pictureLeft ? "left" : "right"), scale: shown ? 1 : 0.97 }}
                  transition={{ duration: 0.65, ease: EASE }}
                >
                  <Panel className="aspect-auto h-[min(64vh,520px)] p-10">
                    <div className="flex w-full origin-center scale-[1.45] items-center justify-center">{card.picture}</div>
                  </Panel>
                </motion.div>

                <motion.div
                  className={cn("max-w-md", pictureLeft ? "order-2" : "order-1 justify-self-end")}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : off(pictureLeft ? "right" : "left") }}
                  transition={{ duration: 0.65, ease: EASE, delay: shown ? 0.08 : 0 }}
                >
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
                  </p>
                  <HugeiconsIcon icon={card.icon} strokeWidth={1.75} className="mt-6 h-7 w-7 text-primary" />
                  <h3 className="mt-4 font-serif text-[clamp(1.6rem,2.6vw,2.25rem)] font-medium leading-[1.12] tracking-[-0.02em] text-balance text-foreground">{card.title}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{card.body}</p>
                  <Link
                    href={card.href}
                    tabIndex={shown ? undefined : -1}
                    className="mt-6 inline-flex border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Read the guide
                  </Link>
                </motion.div>
              </article>
            );
          })}
        </div>

        {/* Where you are in the six. */}
        <div className="mx-auto mt-10 flex w-full max-w-6xl gap-1.5" aria-hidden>
          {CARDS.map((card, i) => (
            <span key={card.title} className={cn("h-1 rounded-full transition-all duration-500", i === active ? "w-10 bg-foreground" : "w-4 bg-foreground/15")} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The same cards, one under another. Phones and tablets, and anyone who asked for less motion. */
function Stack() {
  return (
    <div className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2">
      {CARDS.map((card) => (
        <article key={card.title}>
          <Panel>{card.picture}</Panel>
          <h3 className="mt-5 flex items-start gap-2.5 px-1 text-base font-medium text-foreground">
            <HugeiconsIcon icon={card.icon} strokeWidth={2} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <Link href={card.href} className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {card.title}
            </Link>
          </h3>
          <p className="mt-2.5 px-1 text-[15px] leading-relaxed text-muted-foreground">{card.body}</p>
        </article>
      ))}
    </div>
  );
}

export function MoreSection() {
  // Which layout shows is decided in CSS (screen width and the reduced-motion
  // setting), not in JavaScript, so the server and the browser always agree.
  return (
    <section id="everything" className="scroll-mt-24 bg-background px-5 font-sans antialiased sm:px-8">
      <div className="mx-auto max-w-6xl pt-20 md:pt-28">
        <Heading />
      </div>

      <div className="hidden lg:block motion-reduce:lg:hidden">
        <Stage />
      </div>
      <div className="mx-auto max-w-6xl lg:hidden motion-reduce:lg:block">
        <Stack />
      </div>

      <div className="mx-auto max-w-6xl pb-20 md:pb-28">
        <p className="mt-14 max-w-3xl border-t border-foreground/15 pt-6 text-sm leading-relaxed text-muted-foreground lg:mt-0">{ALSO}</p>
      </div>
    </section>
  );
}
