"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// The demo library (public/landing/demo, fictional) as a hand-placed graph:
// collections are the blue hubs, saves hang off them, and dashed lines are
// the "related by meaning" links the real graph draws between collections.
// Coordinates live in a 1000x520 box so labels are laid out, not simulated.
type Hub = { id: string; label: string; x: number; y: number };
type Item = { id: string; label: string; x: number; y: number; hub: string; side?: "left" | "right" };

const HUBS: Hub[] = [
  { id: "ai", label: "AI engineering", x: 245, y: 205 },
  { id: "homelab", label: "Homelab", x: 175, y: 405 },
  { id: "design", label: "Design references", x: 560, y: 300 },
  { id: "writing", label: "Writing", x: 790, y: 160 },
  { id: "travel", label: "Travel", x: 835, y: 405 },
];

const ITEMS: Item[] = [
  { id: "rag", label: "Why your RAG pipeline returns the wrong chunk", x: 55, y: 88, hub: "ai" },
  { id: "hnsw", label: "HNSW index tuning in Postgres", x: 330, y: 118, hub: "ai" },
  { id: "nas", label: "A 6-bay ZFS NAS for under $500", x: 40, y: 482, hub: "homelab" },
  { id: "calm", label: "Designing calm software", x: 535, y: 96, hub: "design" },
  { id: "pricing", label: "Pricing pages that convert", x: 380, y: 382, hub: "design" },
  { id: "dash", label: "Analytics dashboard, dark", x: 540, y: 470, hub: "design" },
  { id: "plain", label: "Plain-text notes", x: 655, y: 228, hub: "writing" },
  { id: "q3", label: "Q3 planning", x: 945, y: 62, hub: "writing", side: "left" },
  { id: "voice", label: "Podcast ideas", x: 955, y: 258, hub: "writing", side: "left" },
  { id: "lisbon", label: "Lisbon, 4 days", x: 950, y: 488, hub: "travel", side: "left" },
];

// Related by meaning, across collections.
const MEANING: [string, string][] = [
  ["calm", "plain"],
  ["hnsw", "nas"],
];

const W = 1000;
const H = 520;
const at = (id: string) => HUBS.find((h) => h.id === id) ?? ITEMS.find((i) => i.id === id)!;

function neighbours(id: string): Set<string> {
  const set = new Set<string>([id]);
  const item = ITEMS.find((i) => i.id === id);
  if (item) set.add(item.hub);
  for (const i of ITEMS) if (i.hub === id) set.add(i.id);
  for (const [a, b] of MEANING) {
    if (a === id) set.add(b);
    if (b === id) set.add(a);
  }
  return set;
}

export function LibraryGraph() {
  const [active, setActive] = useState<string | null>(null);
  const lit = active ? neighbours(active) : null;
  const on = (id: string) => !lit || lit.has(id);
  const edgeOn = (a: string, b: string) => !lit || (lit.has(a) && lit.has(b) && (a === active || b === active));

  const pin = (id: string) => ({
    onPointerEnter: () => setActive(id),
    onPointerLeave: () => setActive(null),
    onFocus: () => setActive(id),
    onBlur: () => setActive(null),
  });

  return (
    <>
      {/* The one thing the lines encode, said on the page. */}
      <div className="mb-6 hidden flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:flex">
        <span className="flex items-center gap-2">
          <svg width="28" height="2" aria-hidden><line x1="0" y1="1" x2="28" y2="1" className="stroke-foreground/35" strokeWidth={1.5} /></svg>
          In the same collection
        </span>
        <span className="flex items-center gap-2">
          <svg width="28" height="2" aria-hidden><line x1="0" y1="1" x2="28" y2="1" className="stroke-primary" strokeWidth={1.5} strokeDasharray="4 5" /></svg>
          Related by meaning
        </span>
      </div>

      {/* Desktop and tablet: the laid-out graph. */}
      <div className="relative hidden aspect-[1000/520] w-full sm:block">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {ITEMS.map((i) => {
            const h = at(i.hub);
            return (
              <line
                key={i.id}
                x1={i.x}
                y1={i.y}
                x2={h.x}
                y2={h.y}
                strokeWidth={1.25}
                className={cn("transition-[stroke,opacity] duration-300", edgeOn(i.id, i.hub) ? (active ? "stroke-primary" : "stroke-foreground/20") : "stroke-foreground/10 opacity-40")}
              />
            );
          })}
          {MEANING.map(([a, b]) => {
            const p = at(a);
            const q = at(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                strokeWidth={1.25}
                strokeDasharray="4 6"
                className={cn("stroke-primary transition-opacity duration-300", edgeOn(a, b) ? "opacity-80" : "opacity-15")}
              />
            );
          })}
        </svg>

        {ITEMS.map((i) => (
          <button
            key={i.id}
            type="button"
            {...pin(i.id)}
            style={{ left: `${(i.x / W) * 100}%`, top: `${(i.y / H) * 100}%` }}
            className={cn(
              "absolute flex -translate-y-1/2 items-center gap-2 rounded-full py-1 text-[12px] leading-none whitespace-nowrap text-foreground transition-opacity duration-300 focus-visible:outline-none",
              i.side === "left" ? "-translate-x-full flex-row-reverse pl-2.5" : "pr-2.5",
              on(i.id) ? "opacity-100" : "opacity-30",
            )}
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-background", active === i.id ? "bg-primary" : "bg-foreground")} />
            <span className="rounded-md bg-background/90 px-1.5 py-0.5 ring-1 ring-foreground/10">{i.label}</span>
          </button>
        ))}

        {HUBS.map((h) => (
          <button
            key={h.id}
            type="button"
            {...pin(h.id)}
            style={{ left: `${(h.x / W) * 100}%`, top: `${(h.y / H) * 100}%` }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-primary-foreground transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              on(h.id) ? "opacity-100" : "opacity-35",
            )}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Phones: the same library as a tree, one collection at a time. */}
      <ul className="space-y-5 sm:hidden">
        {HUBS.map((h) => (
          <li key={h.id}>
            <span className="inline-block rounded-lg bg-primary px-2.5 py-1 text-[13px] font-medium text-primary-foreground">{h.label}</span>
            <ul className="mt-2 ml-3 space-y-1.5 border-l border-foreground/15 pl-4">
              {ITEMS.filter((i) => i.hub === h.id).map((i) => (
                <li key={i.id} className="relative text-sm text-foreground">
                  <span className="absolute top-1/2 -left-4 h-px w-3 bg-foreground/15" aria-hidden />
                  {i.label}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
