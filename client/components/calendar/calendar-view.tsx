"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, DateSelectArg, DayHeaderContentArg, DayCellContentArg, EventClickArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ChevronLeft, ArrowRight01Icon as ChevronRight, ArrowDown01Icon as ChevronDown, PlusSignIcon as Plus, FilterHorizontalIcon as Filter } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarProviderKey } from "@/lib/calendar-api";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { useCalendarConnectionsQuery, useCalendarEventsQuery, useUpdateCalendarEventMutation, type EventEditTarget } from "@/hooks/use-calendar";
import { EditEventDialog, NewEventDialog, type NewEventDraft } from "./event-dialogs";
import { EventPopover, type EventPopoverState } from "./event-popover";
import { editTargetFor, formatRangeTitle, toFullCalendarEvent, VIEW_LABELS, type CalendarViewKey, type EventSource } from "./calendar-utils";
import { useQuery } from "@tanstack/react-query";
import { getServerConfig } from "@/lib/server-config";
import "./calendar.css";

const VIEW_STORAGE_KEY = "sfl.calendar.view";
const VIEW_KEYS: CalendarViewKey[] = ["timeGridDay", "timeGridWeek", "dayGridMonth", "listWeek"];
const VIEW_SHORTCUTS: Record<string, CalendarViewKey> = { d: "timeGridDay", w: "timeGridWeek", m: "dayGridMonth", a: "listWeek" };

function initialView(): CalendarViewKey {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY) as CalendarViewKey | null;
    if (saved && VIEW_KEYS.includes(saved)) return saved;
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  // Seven columns don't fit a phone; a single day does.
  return window.matchMedia("(max-width: 639px)").matches ? "timeGridDay" : "timeGridWeek";
}

/** The first day of the week for the browser's locale (0 = Sunday), where the browser can tell. */
function localeFirstDay(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
  } catch {
    // Older engines have no week info.
  }
  return 0;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

interface VisibleRange {
  /** What's drawn, including the leading and trailing days of a month grid — the range events are fetched for. */
  from: Date;
  to: Date;
  /** The period itself (the month, week, or day), for the title. */
  currentStart: Date;
  currentEnd: Date;
}

export default function CalendarView() {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [view, setView] = React.useState<CalendarViewKey>(initialView);
  const [firstDay] = React.useState(localeFirstDay);
  const [range, setRange] = React.useState<VisibleRange | null>(null);
  const [hidden, setHidden] = React.useState<Record<EventSource, boolean>>({ savedly: false, google: false });
  const [popover, setPopover] = React.useState<EventPopoverState | null>(null);
  const [editing, setEditing] = React.useState<CalendarEvent | null>(null);
  const [draft, setDraft] = React.useState<NewEventDraft | null>(null);
  const [jumpOpen, setJumpOpen] = React.useState(false);

  const { data: connections = [] } = useCalendarConnectionsQuery();
  const { data: events = [], isFetching } = useCalendarEventsQuery({
    from: range?.from.toISOString() ?? "",
    to: range?.to.toISOString() ?? "",
  });
  const updateMutation = useUpdateCalendarEventMutation();
  const router = useRouter();
  // Adding events (and sending them to Google Calendar) is a paid feature; moving the ones already here isn't.
  const canAdd = usePlanFeature("calendarSync");
  const { data: serverConfig } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const calendarOpen = serverConfig?.googleCalendar ?? true;

  const fcEvents = React.useMemo(() => (range ? events.filter((e) => !hidden[e.source]).map(toFullCalendarEvent) : []), [events, hidden, range]);

  const api = () => calendarRef.current?.getApi();

  const changeView = React.useCallback((next: CalendarViewKey) => {
    calendarRef.current?.getApi().changeView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Remembering the view is a convenience; nothing breaks without it.
    }
  }, []);

  const openNewEvent = React.useCallback((start?: Date, durationMinutes = 60) => {
    if (!canAdd.allowed) {
      toast.add({
        title: `Adding events is part of ${canAdd.requiredPlan ?? "a paid plan"}`,
        description: "You can still see, move and edit the events you already have.",
        actionProps: { children: "See plans", onClick: () => router.push("/app/settings/billing") },
      });
      return;
    }
    let at = start;
    if (!at) {
      // The next half hour today, or 9:00 AM on the day being looked at when that isn't today.
      const now = new Date();
      const viewed = calendarRef.current?.getApi().getDate() ?? now;
      at = new Date(viewed);
      if (viewed.toDateString() === now.toDateString()) {
        at.setHours(now.getHours(), now.getMinutes() < 30 ? 30 : 60, 0, 0);
      } else {
        at.setHours(9, 0, 0, 0);
      }
    }
    setPopover(null);
    setDraft({ start: at, durationMinutes });
  }, [canAdd.allowed, canAdd.requiredPlan, router]);

  // Google Calendar's keys: t today, j/k or arrows to page, d/w/m/a for views, c to create.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[role=dialog]")) return;
      const calendar = calendarRef.current?.getApi();
      if (!calendar) return;
      const key = e.key.toLowerCase();
      if (key === "t") calendar.today();
      else if (key === "j" || key === "arrowright") calendar.next();
      else if (key === "k" || key === "arrowleft") calendar.prev();
      else if (key === "c" || key === "n") openNewEvent();
      else if (VIEW_SHORTCUTS[key]) changeView(VIEW_SHORTCUTS[key]);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeView, openNewEvent]);

  function handleDatesSet(arg: DatesSetArg) {
    setRange({ from: arg.start, to: arg.end, currentStart: arg.view.currentStart, currentEnd: arg.view.currentEnd });
    setView(arg.view.type as CalendarViewKey);
    setPopover(null);
  }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    const event = arg.event.extendedProps.event as CalendarEvent;
    setPopover((current) => (current?.event.id === event.id ? null : { event, rect: arg.el.getBoundingClientRect() }));
  }

  function handleSelect(arg: DateSelectArg) {
    arg.view.calendar.unselect();
    if (arg.allDay) {
      // A day picked in the month grid: start at 9:00 AM that day.
      const start = new Date(arg.start);
      start.setHours(9, 0, 0, 0);
      openNewEvent(start, 60);
      return;
    }
    const minutes = Math.round((arg.end.getTime() - arg.start.getTime()) / 60000);
    // A single click selects one 30-minute slot; treat that as "an hour from here".
    openNewEvent(arg.start, minutes <= 30 ? 60 : minutes);
  }

  async function saveTiming(target: EventEditTarget, event: CalendarEvent, start: Date, durationMinutes: number) {
    return updateMutation.mutateAsync({
      target,
      // The external path has no note to fall back on, so it always needs the title back.
      input: target.kind === "memory" ? { startAt: start.toISOString(), durationMinutes } : { title: event.title, description: event.description, startAt: start.toISOString(), durationMinutes },
    });
  }

  async function handleMoved(arg: EventDropArg | EventResizeDoneArg) {
    const event = arg.event.extendedProps.event as CalendarEvent;
    const target = editTargetFor(event);
    const start = arg.event.start;
    if (!target || !start) return arg.revert();
    const end = arg.event.end ?? new Date(start.getTime() + (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()));
    const durationMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
    const previousStart = new Date(event.startAt);
    const previousDuration = Math.max(15, Math.round((new Date(event.endAt).getTime() - previousStart.getTime()) / 60000));

    try {
      await saveTiming(target, event, start, durationMinutes);
      const when = start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      toast.add({
        title: "endDelta" in arg ? `"${event.title}" now ends ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : `Moved "${event.title}" to ${when}`,
        type: "success",
        actionProps: {
          children: "Undo",
          onClick: () => {
            saveTiming(target, event, previousStart, previousDuration).catch((err: unknown) =>
              toast.add({ title: err instanceof Error ? err.message : "Couldn't undo that.", type: "error" }),
            );
          },
        },
      });
    } catch (err) {
      arg.revert();
      toast.add({ title: err instanceof Error ? err.message : "Couldn't move the event.", type: "error" });
    }
  }

  const title = range ? formatRangeTitle(view, range.currentStart, range.currentEnd) : "";
  const connected = (provider: CalendarProviderKey) => connections.find((c) => c.provider === provider);
  const hiddenCount = (["savedly", "google"] as const).filter((s) => hidden[s] && (s === "savedly" || connected(s))).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="sr-only">Calendar</h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Button variant="outline" onClick={() => api()?.today()} className="h-9 rounded-full px-4 text-[13px]" title="Today (T)">
            Today
          </Button>
          <div className="flex items-center">
            <button type="button" onClick={() => api()?.prev()} aria-label="Previous" title="Previous (K)" className="sfl-icon-btn">
              <HugeiconsIcon icon={ChevronLeft} strokeWidth={2} className="size-4" />
            </button>
            <button type="button" onClick={() => api()?.next()} aria-label="Next" title="Next (J)" className="sfl-icon-btn">
              <HugeiconsIcon icon={ChevronRight} strokeWidth={2} className="size-4" />
            </button>
          </div>

          <Popover open={jumpOpen} onOpenChange={setJumpOpen}>
            <PopoverTrigger
              className="group -ml-1 flex min-w-0 items-center gap-1 rounded-full px-2 py-1 text-left transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              aria-label={`${title}. Pick a date`}
            >
              <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">{title}</h2>
              <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto rounded-2xl p-2">
              <MiniCalendar
                mode="single"
                selected={range?.currentStart}
                defaultMonth={range?.currentStart}
                captionLayout="dropdown"
                startMonth={new Date(2000, 0)}
                endMonth={new Date(new Date().getFullYear() + 10, 11)}
                weekStartsOn={firstDay as 0 | 1 | 2 | 3 | 4 | 5 | 6}
                onSelect={(date) => {
                  if (!date) return;
                  api()?.gotoDate(date);
                  setJumpOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <span className={cn("ml-1 transition-opacity duration-300", isFetching ? "opacity-100" : "opacity-0")} aria-hidden={!isFetching}>
            <Spinner className="size-4 text-muted-foreground" />
          </span>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" className="relative h-9 shrink-0 rounded-full px-3 text-[13px]">
                  <HugeiconsIcon icon={Filter} strokeWidth={2} className="size-4" />
                  <span className="hidden md:inline">Calendars</span>
                  {hiddenCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">{hiddenCount}</span>
                  )}
                </Button>
              }
              aria-label="Choose which calendars to show"
            />
            <PopoverContent align="end" className="w-72 gap-1 rounded-2xl p-2">
              <p className="px-2 pt-1 pb-1.5 text-[13px] font-medium text-foreground">Show events from</p>
              <SourceRow
                label="Your notes"
                detail="Events saved in Savedly"
                swatch="bg-primary"
                checked={!hidden.savedly}
                onChange={(on) => setHidden((h) => ({ ...h, savedly: !on }))}
              />
              {(["google"] as const).map((provider) => {
                const connection = connected(provider);
                const label = "Google Calendar";
                return connection ? (
                  <SourceRow
                    key={provider}
                    label={label}
                    detail={connection.providerAccountEmail ?? "Connected"}
                    swatch="bg-foreground/70"
                    checked={!hidden[provider]}
                    onChange={(on) => setHidden((h) => ({ ...h, [provider]: !on }))}
                  />
                ) : (
                  <div key={provider} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{calendarOpen ? "Not connected" : "In Google's review"}</p>
                    </div>
                    {calendarOpen ? (
                      <Link href="/app/integrations" className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                        Connect
                      </Link>
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Coming soon</span>
                    )}
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>

          <div role="tablist" aria-label="Calendar view" className="flex min-w-0 flex-1 items-center rounded-full bg-foreground/5 p-1 sm:flex-none">
            {VIEW_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                title={`${VIEW_LABELS[key]} (${Object.keys(VIEW_SHORTCUTS).find((k) => VIEW_SHORTCUTS[k] === key)?.toUpperCase()})`}
                onClick={() => changeView(key)}
                className={cn(
                  "h-7 flex-1 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none sm:flex-none",
                  view === key ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {VIEW_LABELS[key]}
              </button>
            ))}
          </div>

          <Button onClick={() => openNewEvent()} className="h-9 shrink-0 rounded-full px-3 text-[13px] sm:px-4" title="New event (C)">
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="size-4" />
            <span className="hidden sm:inline">New event</span>
            <span className="sr-only sm:hidden">New event</span>
          </Button>
        </div>
      </div>

      <div className="sfl-calendar min-h-0 flex-1 overflow-hidden rounded-3xl bg-background ring-1 ring-foreground/10">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="100%"
          firstDay={firstDay}
          events={fcEvents}
          datesSet={handleDatesSet}
          nowIndicator
          editable
          selectable
          selectMirror
          eventInteractive
          dayMaxEvents
          allDayText="All day"
          scrollTime="07:30:00"
          scrollTimeReset={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          snapDuration="00:15:00"
          views={{
            listWeek: { listDayFormat: { weekday: "long" }, listDaySideFormat: { month: "short", day: "numeric" } },
          }}
          dayHeaderContent={(arg) => <DayHeader arg={arg} />}
          dayCellContent={(arg) => <DayCell arg={arg} />}
          eventContent={(arg) => <EventChip arg={arg} />}
          noEventsContent={() => (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-[15px] font-medium text-foreground">Nothing scheduled this week</p>
              <p className="max-w-xs text-sm text-muted-foreground">Save a note with a date in it, or add an event yourself.</p>
              <Button onClick={() => openNewEvent()} variant="outline" className="mt-1 h-9 rounded-full px-4 text-[13px]">
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="size-4" /> New event
              </Button>
            </div>
          )}
          eventClick={handleEventClick}
          eventDragStart={() => setPopover(null)}
          eventResizeStart={() => setPopover(null)}
          eventDrop={handleMoved}
          eventResize={handleMoved}
          select={handleSelect}
        />
      </div>

      <EventPopover
        state={popover}
        onClose={() => setPopover(null)}
        onEdit={(event) => {
          setPopover(null);
          setEditing(event);
        }}
      />
      <EditEventDialog event={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <NewEventDialog draft={draft} onOpenChange={(open) => !open && setDraft(null)} />
    </div>
  );
}

function SourceRow({ label, detail, swatch, checked, onChange }: { label: string; detail: string; swatch: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-foreground/5">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className={cn("size-2.5 shrink-0 rounded-[3px]", swatch)} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}

function DayHeader({ arg }: { arg: DayHeaderContentArg }) {
  const weekday = arg.date.toLocaleDateString(undefined, { weekday: "short" });
  if (arg.view.type === "listWeek") {
    return (
      <span className="flex items-baseline gap-2">
        <span className={cn("font-semibold", arg.isToday ? "text-primary" : "text-foreground")}>
          {arg.isToday ? "Today" : arg.date.toLocaleDateString(undefined, { weekday: "long" })}
        </span>
        <span className="font-normal text-muted-foreground">{arg.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </span>
    );
  }
  if (arg.view.type === "dayGridMonth") {
    return <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{weekday}</span>;
  }
  return (
    <span className="flex flex-col items-center gap-1 py-2">
      <span className={cn("text-[11px] font-medium tracking-wide uppercase", arg.isToday ? "text-primary" : "text-muted-foreground")}>{weekday}</span>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-lg font-semibold tracking-[-0.02em] tabular-nums",
          arg.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
        )}
      >
        {arg.date.getDate()}
      </span>
    </span>
  );
}

function DayCell({ arg }: { arg: DayCellContentArg }) {
  if (arg.view.type !== "dayGridMonth") return null;
  const first = arg.date.getDate() === 1;
  return (
    <span
      className={cn(
        "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
        arg.isToday ? "bg-primary text-primary-foreground" : arg.isOther ? "text-muted-foreground/70" : "text-foreground",
      )}
    >
      {first ? arg.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : arg.date.getDate()}
    </span>
  );
}

function EventChip({ arg }: { arg: EventContentArg }) {
  const event = arg.event.extendedProps.event as CalendarEvent | undefined;
  const isNote = event?.source === "savedly";
  const type = arg.view.type;

  if (type === "listWeek") {
    return (
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-medium text-foreground">{arg.event.title}</span>
        {event && <span className="shrink-0 text-xs text-muted-foreground">{isNote ? "Note" : "Google"}</span>}
      </span>
    );
  }

  // Timed events in the month grid read as a dot, a time, and a title, like a list.
  if (type === "dayGridMonth" && !arg.event.allDay) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 px-1 text-xs">
        <span className={cn("size-2 shrink-0 rounded-full", isNote ? "bg-primary" : "bg-foreground/60")} aria-hidden />
        <span className="shrink-0 text-muted-foreground tabular-nums">{arg.timeText}</span>
        <span className="truncate font-medium text-foreground">{arg.event.title}</span>
      </span>
    );
  }

  if (arg.event.allDay) {
    return <span className="block truncate px-1.5 text-xs font-medium">{arg.event.title}</span>;
  }

  const minutes = arg.event.end && arg.event.start ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000 : 60;
  if (minutes <= 45) {
    return (
      <span className="flex min-w-0 items-baseline gap-1.5 px-1.5 text-xs leading-tight">
        <span className="truncate font-semibold">{arg.event.title}</span>
        <span className="shrink-0 opacity-75 tabular-nums">{arg.timeText.split(" - ")[0]}</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col px-1.5 py-0.5 text-xs leading-tight">
      <span className="line-clamp-2 font-semibold break-words">{arg.event.title}</span>
      <span className="mt-0.5 truncate opacity-75 tabular-nums">{arg.timeText}</span>
    </span>
  );
}
