import type { EventInput } from "@fullcalendar/core";
import type { CalendarEvent, CalendarProviderKey } from "@/lib/calendar-api";
import type { EventEditTarget } from "@/hooks/use-calendar";

export type CalendarViewKey = "timeGridDay" | "timeGridWeek" | "dayGridMonth" | "listWeek";
export type EventSource = CalendarEvent["source"];

export const VIEW_LABELS: Record<CalendarViewKey, string> = {
  timeGridDay: "Day",
  timeGridWeek: "Week",
  dayGridMonth: "Month",
  listWeek: "Agenda",
};

export const SOURCE_LABEL: Record<EventSource, string> = {
  memora: "SaveForLatter",
  google: "Google Calendar",
  microsoft: "Outlook",
};

export function providerName(provider: CalendarProviderKey): string {
  return provider === "google" ? "Google Calendar" : "Outlook";
}

/** Which API an edit or delete goes through, or null when the event can't be changed from here. */
export function editTargetFor(event: CalendarEvent): EventEditTarget | null {
  if (event.memoryId) return { kind: "memory", memoryId: event.memoryId };
  if (event.externalEventId && event.source !== "memora") {
    return { kind: "external", provider: event.source, externalEventId: event.externalEventId };
  }
  return null;
}

/**
 * Maps an API event onto FullCalendar's input. All-day events arrive as
 * midnight UTC of their dates, so only the YYYY-MM-DD part is passed —
 * otherwise a Monday all-day event would start at 5:30 AM in India, or on
 * Sunday evening in California.
 */
export function toFullCalendarEvent(event: CalendarEvent): EventInput {
  const target = editTargetFor(event);
  return {
    id: event.id,
    title: event.title,
    start: event.allDay ? event.startAt.slice(0, 10) : event.startAt,
    end: event.allDay ? event.endAt.slice(0, 10) : event.endAt,
    allDay: event.allDay,
    // An all-day event would turn into a timed one if it were dragged, so it stays put.
    startEditable: target !== null && !event.allDay,
    durationEditable: target !== null && !event.allDay,
    classNames: [`sfl-event`, `sfl-event--${event.source === "memora" ? "note" : "external"}`],
    extendedProps: { event },
  };
}

const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Tue, Oct 6 · 3:00 – 4:00 PM", or "Tue, Oct 6 · All day". */
export function formatEventWhen(event: CalendarEvent): string {
  if (event.allDay) {
    const start = new Date(`${event.startAt.slice(0, 10)}T00:00:00`);
    const lastDay = new Date(`${event.endAt.slice(0, 10)}T00:00:00`);
    lastDay.setDate(lastDay.getDate() - 1);
    const day = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return lastDay > start ? `${day(start)} – ${day(lastDay)} · All day` : `${day(start)} · All day`;
  }
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (start.toDateString() !== end.toDateString()) {
    return `${date}, ${clock(start)} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${clock(end)}`;
  }
  return `${date} · ${clock(start)} – ${clock(end)}`;
}

/** The toolbar heading for the visible range: "October 2026", "Sep 28 – Oct 4, 2026", or "Tuesday, Oct 6, 2026". */
export function formatRangeTitle(view: CalendarViewKey, start: Date, endExclusive: Date): string {
  if (view === "dayGridMonth") return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (view === "timeGridDay") return start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  const endLabel = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}
