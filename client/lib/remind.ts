/**
 * "Remind me": the quick choices and how a reminder time reads. Everything is
 * in the viewer's own time zone; the server gets an ISO time with its offset
 * folded in (toISOString), so 9:00 means 9:00 where they are.
 */

export interface RemindChoice {
  id: string;
  label: string;
  at: Date;
}

const atTime = (base: Date, hours: number, minutes = 0) => {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
};
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

/** The choices that make sense right now: no "this evening" at 10 pm, no "this weekend" on a Sunday afternoon. */
export function remindChoices(now = new Date()): RemindChoice[] {
  const choices: RemindChoice[] = [];
  const hour = now.getHours();

  // Three hours on, rounded up to the quarter hour; only in waking working hours (not 5 am from a 2 am save).
  if (hour >= 7 && hour < 18) {
    const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    later.setMinutes(Math.ceil(later.getMinutes() / 15) * 15, 0, 0);
    choices.push({ id: "later", label: "Later today", at: later });
  }
  if (hour < 16) choices.push({ id: "evening", label: "This evening", at: atTime(now, 18) });
  choices.push({ id: "tomorrow", label: "Tomorrow", at: atTime(addDays(now, 1), 9) });

  const day = now.getDay(); // 0 Sunday … 6 Saturday
  if (day >= 1 && day <= 5) choices.push({ id: "weekend", label: "This weekend", at: atTime(addDays(now, 6 - day), 9) });
  const toMonday = ((8 - day) % 7) || 7;
  choices.push({ id: "next-week", label: "Next week", at: atTime(addDays(now, toMonday), 9) });
  choices.push({ id: "next-month", label: "In a month", at: atTime(new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()), 9) });
  // On a Sunday "Next week" is tomorrow, and on a Friday "This weekend" is tomorrow: keep the first of any two that land at the same time.
  return choices.filter((choice, i) => choices.findIndex((other) => other.at.getTime() === choice.at.getTime()) === i);
}

const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "today at 6:00 PM", "tomorrow at 9:00 AM", "Sat, 25 Oct at 9:00 AM". */
export function formatRemindAt(value: string | Date, now = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const days = Math.round((atTime(d, 0).getTime() - atTime(now, 0).getTime()) / 86_400_000);
  if (days === 0) return `today at ${time(d)}`;
  if (days === 1) return `tomorrow at ${time(d)}`;
  const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return `${date} at ${time(d)}`;
}

/** The short form beside a choice: "6:00 PM", "Sat 9:00 AM", "25 Nov". */
export function shortWhen(d: Date, now = new Date()): string {
  const days = Math.round((atTime(d, 0).getTime() - atTime(now, 0).getTime()) / 86_400_000);
  if (days === 0) return time(d);
  if (days < 7) return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time(d)}`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** For a datetime-local input: "2026-10-18T09:00" in local time. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
