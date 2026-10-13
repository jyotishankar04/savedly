"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon as CalendarIcon,
  Link01Icon as LinkIcon,
  Search01Icon as SearchIcon,
  StickyNote01Icon as NoteIcon,
  Tick02Icon as TickIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// The four small scenes in the hero's product switcher. Each is the real
// interface drawn small and played once: one idea per scene, built from the
// same parts the app uses, with a fictional library (the same one as the
// Help Center screenshots). No screenshots, so they stay sharp at any size
// and follow the theme.

const EASE = [0.16, 1, 0.3, 1] as const;

/** Text that types itself in. Shown whole when motion is reduced. */
function useTyped(text: string, startMs: number, speedMs = 34): string {
  const reduce = useReducedMotionSafe();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => setCount((c) => (c >= text.length ? c : c + 1)), speedMs);
    }, startMs);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [reduce, text, startMs, speedMs]);
  return reduce ? text : text.slice(0, count);
}

/** Fades and lifts its children in after `delay` seconds. */
function Rise({ delay, className, children }: { delay: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

function Tag({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.35, delay: reduce ? 0 : delay }}
      className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
    >
      {children}
    </motion.span>
  );
}

const PANEL = "rounded-xl bg-card shadow-sm ring-1 ring-foreground/[0.07]";
const SCENE = "flex h-full w-full flex-col justify-center gap-3 p-5 sm:p-7";

/** Save: a pasted link becomes a titled, summarized, tagged, filed memory. */
export function SaveScene() {
  const url = useTyped("breadnotes.example/sourdough-hydration", 250);
  return (
    <div className={SCENE}>
      <div className={cn(PANEL, "flex items-center gap-2.5 px-3 py-2.5")}>
        <HugeiconsIcon icon={LinkIcon} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
          {url}
          <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-primary" />
        </span>
        <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">Save</span>
      </div>

      <Rise delay={1.9} className={cn(PANEL, "p-3.5")}>
        <div className="flex gap-3">
          <div className="h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-300/70 dark:to-orange-400/70" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">Sourdough hydration, explained</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              Hydration is water divided by flour, by weight. Start at 65 to 70 percent and raise it once shaping feels easy.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Tag delay={2.5}>baking</Tag>
          <Tag delay={2.65}>sourdough</Tag>
          <Tag delay={2.8}>hydration</Tag>
          <Rise delay={3.2} className="ml-auto text-[10px] text-muted-foreground">
            Filed in <span className="font-medium text-foreground">Recipes</span>
          </Rise>
        </div>
      </Rise>
    </div>
  );
}

/** Search: a vague description still finds the right memory. */
export function SearchScene() {
  const query = useTyped("how much water for bread dough", 250, 42);
  const results = [
    { title: "Sourdough hydration, explained", meta: "breadnotes.example", match: "Matched by meaning", top: true },
    { title: "Sourdough starter feeding schedule", meta: "Note", match: "Related", top: false },
    { title: "Pottery studios directory", meta: "claydirectory.example", match: "", top: false },
  ];
  return (
    <div className={SCENE}>
      <div className={cn(PANEL, "flex items-center gap-2.5 px-3 py-2.5 ring-primary/40")}>
        <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
          {query}
          <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-primary" />
        </span>
      </div>
      <div className="space-y-2">
        {results.map((r, i) => (
          <Rise key={r.title} delay={1.9 + i * 0.16} className={cn(PANEL, "flex items-center gap-3 px-3 py-2.5", !r.top && i === 2 && "opacity-55")}>
            <div className={cn("h-8 w-8 shrink-0 rounded-md", r.top ? "bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-300/70 dark:to-orange-400/70" : "bg-muted")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground">{r.title}</p>
              <p className="truncate text-[10px] text-muted-foreground">{r.meta}</p>
            </div>
            {r.match && (
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium", r.top ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {r.match}
              </span>
            )}
          </Rise>
        ))}
      </div>
    </div>
  );
}

/** Ask: an answer in plain words, with the memories it came from. */
export function AskScene() {
  return (
    <div className={SCENE}>
      <Rise delay={0.2} className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[12px] text-primary-foreground">
        What did I save about sourdough?
      </Rise>
      <Rise delay={1.1} className={cn(PANEL, "max-w-[92%] p-3.5")}>
        <p className="text-[12px] leading-relaxed text-foreground">
          Two things. A guide saying to start at <span className="font-semibold">65 to 70% hydration</span>, and your own note to feed the starter{" "}
          <span className="font-semibold">1:1:1, once a day</span>.
        </p>
        <Rise delay={1.9} className="mt-3 border-t border-foreground/[0.07] pt-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">From your library</p>
          <div className="mt-1.5 flex gap-1.5">
            {["Sourdough hydration, explained", "Starter feeding schedule"].map((t) => (
              <span key={t} className="min-w-0 truncate rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground">
                {t}
              </span>
            ))}
          </div>
        </Rise>
      </Rise>
    </div>
  );
}

/** Organize: collections fill themselves, and a date in a note becomes an event. */
export function OrganizeScene() {
  const reduce = useReducedMotionSafe();
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setAdded(true), 3000);
    return () => clearTimeout(t);
  }, [reduce]);
  const done = reduce || added;

  const collections = [
    { name: "Recipes", emoji: "🍞", count: 2 },
    { name: "Travel", emoji: "✈️", count: 2 },
    { name: "Health", emoji: "🦷", count: 2 },
  ];
  return (
    <div className={SCENE}>
      <div className="grid grid-cols-3 gap-2">
        {collections.map((c, i) => (
          <Rise key={c.name} delay={0.2 + i * 0.12} className={cn(PANEL, "p-3")}>
            <div className="flex items-start justify-between">
              <span className="text-xl font-semibold tabular-nums text-foreground">{c.count}</span>
              <span className="text-sm">{c.emoji}</span>
            </div>
            <p className="mt-2 truncate text-[11px] font-medium text-muted-foreground">{c.name}</p>
          </Rise>
        ))}
      </div>

      <Rise delay={1.2} className={cn(PANEL, "flex items-center gap-3 px-3 py-2.5")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <HugeiconsIcon icon={NoteIcon} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-foreground">Dentist appointment on Thursday</p>
          <p className="truncate text-[10px] text-muted-foreground">Found a date: Thu, 4:30 pm</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors duration-500",
            done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary text-primary-foreground",
          )}
        >
          <HugeiconsIcon icon={done ? TickIcon : CalendarIcon} strokeWidth={2.5} className="h-3 w-3" />
          {done ? "On your calendar" : "Add to calendar"}
        </span>
      </Rise>
    </div>
  );
}
