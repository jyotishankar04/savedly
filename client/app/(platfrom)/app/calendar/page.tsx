"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusIcon as Plus,
  Calendar03Icon as CalendarIcon,
  ExternalLinkIcon as ExternalLink,
  StickyNote01Icon as StickyNote,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  Edit01Icon as Edit,
  Delete02Icon as Trash2,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarProviderKey } from "@/lib/calendar-api";
import {
  useCalendarConnectionsQuery,
  useCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useUpdateCalendarEventMutation,
  type EventEditTarget,
} from "@/hooks/use-calendar";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return Math.min(24 * 60, Math.max(0, d.getHours() * 60 + d.getMinutes()));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const SOURCE_LABEL: Record<CalendarEvent["source"], string> = {
  memora: "Memora only",
  google: "Google Calendar",
  microsoft: "Outlook",
};

const SOURCE_DOT: Record<CalendarEvent["source"], string> = {
  memora: "bg-primary",
  google: "bg-blue-500",
  microsoft: "bg-teal-500",
};

const SOURCE_STYLE: Record<CalendarEvent["source"], { bg: string; border: string; text: string }> = {
  memora: { bg: "bg-primary/10", border: "border-primary/50", text: "text-primary" },
  google: { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-400", text: "text-blue-700 dark:text-blue-300" },
  microsoft: { bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-400", text: "text-teal-700 dark:text-teal-300" },
};

// ---------------------------------------------------------------------------
// Overlap layout — assigns each event a column/columns count so same-day
// overlapping events sit side by side instead of stacking on top of each
// other, the same approach most week-grid calendars use.
// ---------------------------------------------------------------------------

interface LaidOutEvent extends CalendarEvent {
  col: number;
  cols: number;
}

function layoutDayEvents(events: CalendarEvent[]): LaidOutEvent[] {
  const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const result: LaidOutEvent[] = [];
  let cluster: LaidOutEvent[] = [];
  let clusterEnd = -Infinity;
  const active: { end: number; col: number }[] = [];

  function flush() {
    if (cluster.length === 0) return;
    const maxCols = Math.max(...cluster.map((e) => e.col)) + 1;
    for (const e of cluster) e.cols = maxCols;
    result.push(...cluster);
    cluster = [];
  }

  for (const ev of sorted) {
    const start = new Date(ev.startAt).getTime();
    const end = new Date(ev.endAt).getTime();

    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= start) active.splice(i, 1);
    }
    if (active.length === 0 && cluster.length > 0 && start >= clusterEnd) flush();

    const usedCols = new Set(active.map((a) => a.col));
    let col = 0;
    while (usedCols.has(col)) col++;

    active.push({ end, col });
    cluster.push({ ...ev, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type ViewMode = "day" | "week" | "month";
type SourceVisibility = Record<CalendarEvent["source"], boolean>;

const HOUR_HEIGHT = 52;

export default function CalendarPage() {
  const [view, setView] = React.useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [newEventOpen, setNewEventOpen] = React.useState(false);
  const [detailsEvent, setDetailsEvent] = React.useState<CalendarEvent | null>(null);
  const [sourceVisible, setSourceVisible] = React.useState<SourceVisibility>({ memora: true, google: true, microsoft: true });

  const { data: connections } = useCalendarConnectionsQuery();
  const isConnected = (provider: CalendarProviderKey) => connections?.some((c) => c.provider === provider) ?? false;

  const range = React.useMemo(() => {
    if (view === "day") {
      const from = startOfDay(anchorDate);
      return { from, to: addDays(from, 1) };
    }
    if (view === "week") {
      const from = startOfWeek(anchorDate);
      return { from, to: addDays(from, 7) };
    }
    const from = startOfMonth(anchorDate);
    return { from, to: startOfNextMonth(from) };
  }, [view, anchorDate]);

  const { data: events = [], isLoading } = useCalendarEventsQuery({ from: range.from.toISOString(), to: range.to.toISOString() });
  const visibleEvents = React.useMemo(() => events.filter((e) => sourceVisible[e.source]), [events, sourceVisible]);

  // Independent of the visible range so the sidebar's "Upcoming" list stays
  // populated regardless of which day/week/month is currently on screen.
  const upcomingRange = React.useMemo(() => {
    const from = new Date();
    return { from: from.toISOString(), to: addDays(from, 30).toISOString() };
  }, []);
  const { data: upcomingRaw = [] } = useCalendarEventsQuery(upcomingRange);
  const upcoming = React.useMemo(
    () =>
      upcomingRaw
        .filter((e) => sourceVisible[e.source])
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .slice(0, 5),
    [upcomingRaw, sourceVisible],
  );

  function goToday() {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDate(now);
  }
  function goPrev() {
    setAnchorDate((d) => (view === "day" ? addDays(d, -1) : view === "week" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  }
  function goNext() {
    setAnchorDate((d) => (view === "day" ? addDays(d, 1) : view === "week" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1)));
  }

  const days = view === "day" ? [startOfDay(anchorDate)] : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchorDate), i)) : [];

  const rangeLabel =
    view === "month"
      ? anchorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "day"
        ? anchorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
        : `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <aside className="space-y-5">
          <Button onClick={() => setNewEventOpen(true)} className="h-9 w-full rounded-full text-xs font-bold">
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3.5 w-3.5" /> New event
          </Button>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              setSelectedDate(date);
              setAnchorDate(date);
            }}
            modifiers={{ hasEvent: events.map((e) => new Date(e.startAt)) }}
            modifiersClassNames={{
              hasEvent:
                "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            className="w-full rounded-xl border border-border p-2"
          />

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">My calendars</h3>
            <div className="space-y-2">
              <CalendarToggleRow
                color={SOURCE_DOT.memora}
                label="Memora"
                checked={sourceVisible.memora}
                onChange={(v) => setSourceVisible((s) => ({ ...s, memora: v }))}
              />
              <CalendarToggleRow
                color={SOURCE_DOT.google}
                label="Google Calendar"
                checked={sourceVisible.google}
                onChange={(v) => setSourceVisible((s) => ({ ...s, google: v }))}
                connected={isConnected("google")}
              />
              <CalendarToggleRow
                color={SOURCE_DOT.microsoft}
                label="Outlook"
                checked={sourceVisible.microsoft}
                onChange={(v) => setSourceVisible((s) => ({ ...s, microsoft: v }))}
                connected={isConnected("microsoft")}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nothing coming up.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2">
                    <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", SOURCE_DOT[ev.source])} />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-foreground">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ev.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {formatTime(ev.startAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
              >
                <HugeiconsIcon icon={ChevronLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
              </button>
              <Button variant="outline" size="sm" onClick={goToday} className="h-7 rounded-full px-3 text-[11px] font-bold">
                Today
              </Button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
              >
                <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className="h-3.5 w-3.5" />
              </button>
              <h2 className="ml-1 text-sm font-bold text-foreground">{rangeLabel}</h2>
            </div>

            <div className="flex items-center rounded-full border border-border bg-card p-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "month" ? (
            <MonthDayList selectedDate={selectedDate} events={visibleEvents} isLoading={isLoading} onEventClick={setDetailsEvent} />
          ) : (
            <TimeGridView days={days} events={visibleEvents} today={new Date()} onEventClick={setDetailsEvent} />
          )}
        </div>
      </div>

      <NewEventDialog open={newEventOpen} onOpenChange={setNewEventOpen} defaultDate={selectedDate} />
      <EventDetailsDialog event={detailsEvent} open={detailsEvent !== null} onOpenChange={(open) => !open && setDetailsEvent(null)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

function CalendarToggleRow({
  color,
  label,
  checked,
  onChange,
  connected = true,
}: {
  color: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  connected?: boolean;
}) {
  if (!connected) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full opacity-30", color)} /> {label}
        </span>
        <Link href="/app/integrations" className="text-[10px] font-semibold text-primary hover:underline">
          Connect
        </Link>
      </div>
    );
  }
  return (
    <label className="flex items-center gap-2 text-[11px] font-medium text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border accent-primary"
      />
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} /> {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Week / Day time grid
// ---------------------------------------------------------------------------

function TimeGridView({
  days,
  events,
  today,
  onEventClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  today: Date;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Open on business hours rather than midnight — nobody wants to scroll
  // past ten empty rows every time they open the week view. Both scroll
  // containers (the fixed time gutter and the actual day columns) need to
  // start at the same offset, since they're two separate scroll areas kept
  // in sync only via the onScroll handler below.
  React.useEffect(() => {
    const top = 7 * HOUR_HEIGHT;
    gridRef.current?.scrollTo({ top });
    if (gutterRef.current) gutterRef.current.scrollTop = top;
  }, []);

  const nowMinutes = minutesSinceMidnight(today.toISOString());

  return (
    <div className="flex rounded-xl border border-border">
      <div className="w-12 shrink-0 border-r border-border">
        <div className="h-10 border-b border-border" />
        <div ref={gutterRef} className="max-h-[560px] overflow-y-hidden" style={{ height: 560 }}>
          <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[9px] text-muted-foreground" style={{ top: h * HOUR_HEIGHT }}>
                {h === 0 ? "" : new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        className="flex flex-1 overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 560 }}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
      >
        {days.map((day) => {
          const laidOut = layoutDayEvents(events.filter((e) => isSameDay(new Date(e.startAt), day)));
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="relative min-w-[100px] flex-1 border-r border-border last:border-r-0">
              <div className="sticky top-0 z-10 flex h-10 flex-col items-center justify-center border-b border-border bg-card">
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className={cn("text-xs font-bold leading-none", isToday ? "text-primary" : "text-foreground")}>{day.getDate()}</p>
              </div>

              <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/50" style={{ top: h * HOUR_HEIGHT }} />
                ))}

                {isToday && (
                  <div className="absolute inset-x-0 z-10 border-t-2 border-destructive" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                    <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                  </div>
                )}

                {laidOut.map((ev) => {
                  const top = (minutesSinceMidnight(ev.startAt) / 60) * HOUR_HEIGHT;
                  const durationMinutes = Math.max(20, (new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime()) / 60000);
                  const height = (durationMinutes / 60) * HOUR_HEIGHT;
                  const style = SOURCE_STYLE[ev.source];
                  const widthPct = 100 / ev.cols;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] leading-tight shadow-sm transition-opacity hover:opacity-90",
                        style.bg,
                        style.border,
                        style.text,
                      )}
                      style={{ top, height, left: `${ev.col * widthPct}%`, width: `calc(${widthPct}% - 3px)` }}
                    >
                      <p className="truncate font-semibold">{ev.title}</p>
                      <p className="truncate opacity-80">{formatTime(ev.startAt)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month view's day list (the mini month calendar itself lives in the
// sidebar, always visible — this just shows what's on the selected day)
// ---------------------------------------------------------------------------

function MonthDayList({
  selectedDate,
  events,
  isLoading,
  onEventClick,
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  isLoading: boolean;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const dayEvents = React.useMemo(
    () => events.filter((e) => isSameDay(new Date(e.startAt), selectedDate)).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [events, selectedDate],
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-foreground">
        {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </h3>

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : dayEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-[11px] text-muted-foreground">Nothing on this day.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {dayEvents.map((event) => (
            <EventRow key={event.id} event={event} onClick={() => onEventClick(event)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const time = formatTime(event.startAt);

  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/40">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={event.source === "memora" ? StickyNote : CalendarIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-xs font-semibold text-foreground">{event.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {time} · {SOURCE_LABEL[event.source]}
          </p>
          {event.description && <p className="line-clamp-2 text-[11px] text-muted-foreground">{event.description}</p>}
        </div>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// New event dialog
// ---------------------------------------------------------------------------

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Rendered inline, not behind a Popover trigger — a Popover's portal
 * fighting a Dialog's own modal overlay for top stacking is a real,
 * reproducible bug (confirmed via elementFromPoint: the dialog overlay
 * wins the hit-test over the popover's calendar), not just a visual quirk.
 * Showing the calendar directly avoids that whole class of conflict.
 */
function EventSchedule({
  start,
  onStart,
  duration,
  onDuration,
}: {
  start: Date;
  onStart: (date: Date) => void;
  duration: number;
  onDuration: (minutes: number) => void;
}) {
  const timeValue = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const end = new Date(start.getTime() + duration * 60000);
  const sameDay = end.toDateString() === start.toDateString();
  const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const next = new Date(date);
    next.setHours(start.getHours(), start.getMinutes(), 0, 0);
    onStart(next);
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [h, m] = e.target.value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const next = new Date(start);
    next.setHours(h, m, 0, 0);
    onStart(next);
  }

  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)]">
      <Calendar
        mode="single"
        selected={start}
        onSelect={handleDateSelect}
        className="mx-auto bg-transparent p-0 [--cell-size:--spacing(9)]"
        classNames={{ today: "rounded-(--cell-radius) font-semibold text-primary data-[selected=true]:rounded-none" }}
      />

      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="event-time">Time</FieldLabel>
          <Input id="event-time" type="time" value={timeValue} onChange={handleTimeChange} className="h-10 w-full text-sm" />
        </div>
        <div className="space-y-2">
          <FieldLabel>Duration</FieldLabel>
          <DurationSelect value={duration} onChange={onDuration} />
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
          <p className="font-medium text-foreground">
            {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {clock(start)} – {clock(end)}
            {!sameDay && " (next day)"}
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

/** Title, description, and schedule: the fields New event and Edit event share, so the two can't drift apart. */
function EventFields({
  title,
  onTitle,
  description,
  onDescription,
  start,
  onStart,
  duration,
  onDuration,
  titlePlaceholder,
}: {
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  start: Date;
  onStart: (d: Date) => void;
  duration: number;
  onDuration: (m: number) => void;
  titlePlaceholder?: string;
}) {
  return (
    <ScrollArea className="min-h-0" viewportClassName="max-h-[58dvh] pr-3">
      <div className="space-y-6 pb-1">
        <div className="space-y-2">
          <FieldLabel htmlFor="event-title">Title</FieldLabel>
          <Input id="event-title" value={title} onChange={(e) => onTitle(e.target.value)} required autoFocus className="h-10 text-sm" placeholder={titlePlaceholder} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="event-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="event-description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            rows={3}
            placeholder="Add details, a link, or notes"
            className="max-h-40 resize-none text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-3">
          <FieldLabel>Date &amp; time</FieldLabel>
          <EventSchedule start={start} onStart={onStart} duration={duration} onDuration={onDuration} />
        </div>
      </div>
    </ScrollArea>
  );
}

function DurationSelect({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => v && onChange(Number(v))}>
      <SelectTrigger className="h-10 w-full text-sm">
        {/* A render-prop, not the bare default — otherwise the trigger shows
            the raw value ("60") until the dropdown has been opened at least
            once, since Base UI resolves the label from a rendered
            SelectItem it hasn't mounted yet. */}
        <SelectValue>{(v: string) => DURATION_OPTIONS.find((opt) => String(opt.minutes) === v)?.label ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DURATION_OPTIONS.map((opt) => (
          <SelectItem key={opt.minutes} value={String(opt.minutes)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NewEventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
}) {
  const createMutation = useCreateCalendarEventMutation();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDraft, setStartDraft] = React.useState(defaultDate);
  const [durationMinutes, setDurationMinutes] = React.useState(60);

  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setDescription("");
      setStartDraft(defaultDate);
      setDurationMinutes(60);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || createMutation.isPending) return;

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: startDraft.toISOString(),
        durationMinutes,
      });
      const synced = result.pushedTo.length > 0 ? ` and synced to ${result.pushedTo.map((p) => (p === "google" ? "Google Calendar" : "Outlook")).join(" & ")}` : "";
      toast.add({ title: `Event created${synced}`, type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't create the event.", type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] sm:max-w-xl gap-5 p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight">New event</DialogTitle>
          <DialogDescription className="text-sm">Saved to Memora and synced to any calendar you&apos;ve connected.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5">
          <EventFields
            title={title}
            onTitle={setTitle}
            description={description}
            onDescription={setDescription}
            start={startDraft}
            onStart={setStartDraft}
            duration={durationMinutes}
            onDuration={setDurationMinutes}
            titlePlaceholder="Meeting with…"
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-full px-5 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} className="h-10 rounded-full px-6 text-sm">
              {createMutation.isPending ? "Saving…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Event details — view, edit, and delete, from a single click on any event
// ---------------------------------------------------------------------------

function EventDetailsDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMutation = useUpdateCalendarEventMutation();
  const deleteMutation = useDeleteCalendarEventMutation();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDraft, setStartDraft] = React.useState(() => new Date());
  const [durationMinutes, setDurationMinutes] = React.useState(60);

  // Reseed the form whenever a *different* event opens — same
  // wasOpen/seed-on-change pattern used by AddToCalendarDialog/NewEventDialog
  // elsewhere in this app, adjusting state during render rather than in a
  // useEffect.
  const [seededId, setSeededId] = React.useState<string | null>(null);
  if (open && event && seededId !== event.id) {
    setSeededId(event.id);
    setEditing(false);
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartDraft(new Date(event.startAt));
    const durMin = Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000);
    setDurationMinutes(DURATION_OPTIONS.some((opt) => opt.minutes === durMin) ? durMin : 60);
  }

  if (!event) return null;

  // Almost every event has a memoryId (created here, or AI-detected on an
  // existing memory) — the external-only path only applies to something
  // that already existed on a connected calendar before Memora ever saw it.
  const target: EventEditTarget | null = event.memoryId
    ? { kind: "memory", memoryId: event.memoryId }
    : event.externalEventId
      ? { kind: "external", provider: event.source as CalendarProviderKey, externalEventId: event.externalEventId }
      : null;
  const isPending = updateMutation.isPending || deleteMutation.isPending;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !title.trim() || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({
        target,
        input: { title: title.trim(), description: description.trim() || null, startAt: startDraft.toISOString(), durationMinutes },
      });
      toast.add({ title: "Event updated", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update the event.", type: "error" });
    }
  }

  async function handleDelete() {
    if (!target || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync(target);
      toast.add({ title: "Event removed", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't remove the event.", type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] sm:max-w-xl gap-5 p-6">
        {editing ? (
          <>
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">Edit event</DialogTitle>
              <DialogDescription className="text-sm">Changes sync to any calendar this event was added to.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="flex min-h-0 flex-col gap-5">
              <EventFields
                title={title}
                onTitle={setTitle}
                description={description}
                onDescription={setDescription}
                start={startDraft}
                onStart={setStartDraft}
                duration={durationMinutes}
                onDuration={setDurationMinutes}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="h-10 rounded-full px-5 text-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={!title.trim() || isPending} className="h-10 rounded-full px-6 text-sm">
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="gap-1 pr-6">
              <DialogTitle className="text-lg font-semibold tracking-tight">{event.title}</DialogTitle>
              <DialogDescription className="text-sm">
                {new Date(event.startAt).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {SOURCE_LABEL[event.source]}
              </DialogDescription>
            </DialogHeader>

            {event.description && (
              <ScrollArea className="min-h-0" viewportClassName="max-h-48 pr-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
              </ScrollArea>
            )}

            {(event.htmlLink || event.memoryId) && (
              <div className="flex flex-wrap gap-2">
                {event.htmlLink && (
                  <Button render={<Link href={event.htmlLink} target="_blank" rel="noreferrer" />} nativeButton={false} variant="outline" className="h-9 rounded-full px-4 text-sm font-medium">
                    Open in {event.source === "google" ? "Google Calendar" : "Outlook"}{" "}
                    <HugeiconsIcon icon={ExternalLink} strokeWidth={2} className="h-3.5 w-3.5" />
                  </Button>
                )}
                {event.memoryId && (
                  <Button render={<Link href={`/app/memories/${event.memoryId}`} />} nativeButton={false} variant="outline" className="h-9 rounded-full px-4 text-sm font-medium">
                    View memory
                  </Button>
                )}
              </div>
            )}

            {target && (
              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <HugeiconsIcon icon={Trash2} strokeWidth={2} className="h-4 w-4" /> {deleteMutation.isPending ? "Removing…" : "Remove"}
                </Button>
                <Button type="button" disabled={isPending} onClick={() => setEditing(true)} className="h-10 rounded-full px-6 text-sm">
                  <HugeiconsIcon icon={Edit} strokeWidth={2} className="h-4 w-4" /> Edit
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
