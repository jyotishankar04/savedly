"use client";

/**
 * A date-and-time picker written as a sentence — "October 3 at 9:00 AM for
 * 1 hour" — where each part opens its own grid. Adapted from Ruixen UI's
 * Calendar Scheduler (ruixen.com/r/calendar-scheduler): controlled instead
 * of confirm-based, drawn with the app's tokens, a duration part added, the
 * week start taken from the locale, and no sound.
 */

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ChevronLeft, ArrowRight01Icon as ChevronRight } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type Part = "month" | "day" | "time" | "duration";

const DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clock(minutesOfDay: number) {
  return new Date(2000, 0, 1, Math.floor(minutesOfDay / 60), minutesOfDay % 60).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  if (Number.isInteger(h)) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.floor(h)} h ${minutes % 60} min`;
}

export interface CalendarSchedulerProps {
  /** The chosen start. */
  value: Date;
  onChange: (value: Date) => void;
  /** Length in minutes; the "for …" part only shows when this is given. */
  duration?: number;
  onDurationChange?: (minutes: number) => void;
  durations?: number[];
  /** Minutes between time slots. Default 15. */
  interval?: number;
  /** 0 = Sunday. Default: the locale's own first day, or Sunday. */
  weekStartsOn?: number;
  className?: string;
}

function localeWeekStart(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
  } catch {
    // No week info in this engine.
  }
  return 0;
}

const segmentClass = (active: boolean) =>
  cn(
    "rounded-[10px] px-2 py-0.5 text-[26px] leading-[1.3] font-light tracking-[-0.02em] text-foreground tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    active ? "bg-foreground/[0.07]" : "shadow-[inset_0_-1px_0_color-mix(in_oklab,var(--foreground)_18%,transparent)] hover:bg-foreground/[0.04]",
  );

const cellClass = (selected: boolean) =>
  cn(
    "relative rounded-lg py-2 text-center text-[13px] tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    selected ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground",
  );

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {children}
    </motion.button>
  );
}

export function CalendarScheduler({
  value,
  onChange,
  duration,
  onDurationChange,
  durations = DEFAULT_DURATIONS,
  interval = 15,
  weekStartsOn,
  className,
}: CalendarSchedulerProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = React.useState<Part | null>(null);
  // The month being browsed can differ from the chosen one until a day is picked.
  const [view, setView] = React.useState(() => ({ year: value.getFullYear(), month: value.getMonth() }));
  const [firstDay] = React.useState(() => weekStartsOn ?? localeWeekStart());
  const rootRef = React.useRef<HTMLDivElement>(null);
  const timeListRef = React.useRef<HTMLDivElement>(null);
  const today = React.useMemo(() => new Date(), []);

  const minutesOfDay = value.getHours() * 60 + value.getMinutes();
  const slots = React.useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 24 * 60; m += interval) out.push(m);
    // A start dragged out on the calendar may sit between slots; keep it pickable.
    if (!out.includes(minutesOfDay)) out.push(minutesOfDay);
    return out.sort((a, b) => a - b);
  }, [interval, minutesOfDay]);
  const durationOptions = duration !== undefined && !durations.includes(duration) ? [...durations, duration].sort((a, b) => a - b) : durations;

  const weekdays = React.useMemo(() => {
    const base = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + ((firstDay + i) % 7));
      return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    });
  }, [firstDay]);

  const cells = React.useMemo(() => {
    const lead = (new Date(view.year, view.month, 1).getDay() - firstDay + 7) % 7;
    return [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysIn(view.year, view.month) }, (_, i) => i + 1)];
  }, [view, firstDay]);

  React.useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Open the time list on the chosen time, not at midnight.
  React.useEffect(() => {
    if (open !== "time") return;
    const frame = requestAnimationFrame(() => {
      const selected = timeListRef.current?.querySelector<HTMLElement>("[aria-pressed=true]");
      if (selected && timeListRef.current) timeListRef.current.scrollTop = selected.offsetTop - timeListRef.current.clientHeight / 2 + selected.clientHeight / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function toggle(part: Part) {
    if (part === "day" || part === "month") setView({ year: value.getFullYear(), month: value.getMonth() });
    setOpen((current) => (current === part ? null : part));
  }

  function setDate(year: number, month: number, day: number) {
    const next = new Date(value);
    next.setFullYear(year, month, Math.min(day, daysIn(year, month)));
    onChange(next);
  }

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };
  const stagger = (i: number) =>
    reduceMotion ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0, transition: { delay: Math.min(Math.max(i, 0), 30) * 0.012 } } };
  const end = duration !== undefined ? new Date(value.getTime() + duration * 60000) : null;

  return (
    <div ref={rootRef} className={cn("select-none", className)}>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2">
        <motion.button type="button" aria-expanded={open === "month"} aria-label="Month" onClick={() => toggle("month")} whileTap={{ scale: 0.97 }} className={segmentClass(open === "month")}>
          {value.toLocaleDateString(undefined, { month: "long" })}
        </motion.button>
        <motion.button type="button" aria-expanded={open === "day"} aria-label="Day" onClick={() => toggle("day")} whileTap={{ scale: 0.97 }} className={segmentClass(open === "day")}>
          {value.getDate()}
        </motion.button>
        <span className="px-0.5 text-xl font-light text-muted-foreground">at</span>
        <motion.button type="button" aria-expanded={open === "time"} aria-label="Time" onClick={() => toggle("time")} whileTap={{ scale: 0.97 }} className={segmentClass(open === "time")}>
          {clock(minutesOfDay)}
        </motion.button>
        {duration !== undefined && onDurationChange && (
          <>
            <span className="px-0.5 text-xl font-light text-muted-foreground">for</span>
            <motion.button
              type="button"
              aria-expanded={open === "duration"}
              aria-label="Duration"
              onClick={() => toggle("duration")}
              whileTap={{ scale: 0.97 }}
              className={segmentClass(open === "duration")}
            >
              {formatDurationShort(duration)}
            </motion.button>
          </>
        )}
      </div>

      <p className="mt-2 px-2 text-xs text-muted-foreground tabular-nums">
        {value.toLocaleDateString(undefined, { weekday: "long" })}, {value.getFullYear()}
        {end && ` · ends ${end.toDateString() === value.toDateString() ? clock(end.getHours() * 60 + end.getMinutes()) : end.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {open === "month" && (
          <motion.div key="month" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <div className="mt-4 border-t border-foreground/8 pt-4">
              <div className="mb-3 flex items-center justify-center gap-4">
                <NavButton label="Previous year" onClick={() => setView((v) => ({ ...v, year: v.year - 1 }))}>
                  <HugeiconsIcon icon={ChevronLeft} strokeWidth={2} className="size-4" />
                </NavButton>
                <span className="text-[13px] font-medium text-foreground tabular-nums">{view.year}</span>
                <NavButton label="Next year" onClick={() => setView((v) => ({ ...v, year: v.year + 1 }))}>
                  <HugeiconsIcon icon={ChevronRight} strokeWidth={2} className="size-4" />
                </NavButton>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const selected = view.year === value.getFullYear() && i === value.getMonth();
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      aria-pressed={selected}
                      {...stagger(i)}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setDate(view.year, i, value.getDate());
                        setView({ year: view.year, month: i });
                        setOpen("day");
                      }}
                      className={cellClass(selected)}
                    >
                      {new Date(2000, i, 1).toLocaleDateString(undefined, { month: "short" })}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {open === "day" && (
          <motion.div key="day" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <div className="mt-4 border-t border-foreground/8 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <NavButton label="Previous month" onClick={() => shiftMonth(-1)}>
                  <HugeiconsIcon icon={ChevronLeft} strokeWidth={2} className="size-4" />
                </NavButton>
                <span className="text-[13px] font-medium text-foreground">
                  {new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <NavButton label="Next month" onClick={() => shiftMonth(1)}>
                  <HugeiconsIcon icon={ChevronRight} strokeWidth={2} className="size-4" />
                </NavButton>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {weekdays.map((d) => (
                  <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  if (d === null) return <div key={`lead-${i}`} />;
                  const selected = view.year === value.getFullYear() && view.month === value.getMonth() && d === value.getDate();
                  const isToday = view.year === today.getFullYear() && view.month === today.getMonth() && d === today.getDate();
                  return (
                    <motion.button
                      key={d}
                      type="button"
                      aria-pressed={selected}
                      aria-current={isToday ? "date" : undefined}
                      {...stagger(i)}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => {
                        setDate(view.year, view.month, d);
                        setOpen("time");
                      }}
                      className={cn(cellClass(selected), isToday && !selected && "font-semibold text-primary")}
                    >
                      {d}
                      {isToday && !selected && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {open === "time" && (
          <motion.div key="time" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <div className="mt-4 border-t border-foreground/8 pt-4">
              <div ref={timeListRef} className="relative grid max-h-56 grid-cols-3 gap-1 overflow-y-auto pr-1 [scrollbar-width:thin] sm:grid-cols-4">
                {slots.map((m, i) => {
                  const selected = m === minutesOfDay;
                  return (
                    <motion.button
                      key={m}
                      type="button"
                      aria-pressed={selected}
                      {...stagger(i - Math.max(0, slots.indexOf(minutesOfDay) - 8))}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        const next = new Date(value);
                        next.setHours(Math.floor(m / 60), m % 60, 0, 0);
                        onChange(next);
                        setOpen(onDurationChange ? "duration" : null);
                      }}
                      className={cellClass(selected)}
                    >
                      {clock(m)}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {open === "duration" && duration !== undefined && onDurationChange && (
          <motion.div key="duration" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
            <div className="mt-4 grid grid-cols-4 gap-1 border-t border-foreground/8 pt-4">
              {durationOptions.map((m, i) => (
                <motion.button
                  key={m}
                  type="button"
                  aria-pressed={m === duration}
                  {...stagger(i)}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onDurationChange(m);
                    setOpen(null);
                  }}
                  className={cellClass(m === duration)}
                >
                  {formatDurationShort(m)}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
