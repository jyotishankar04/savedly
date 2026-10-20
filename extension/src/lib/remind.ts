// "Remind me" times for the popup: the web app's choices (client/lib/remind.ts),
// trimmed to the ones that fit as chips. Local time; the server gets ISO.

const atTime = (base: Date, hours: number) => {
  const d = new Date(base);
  d.setHours(hours, 0, 0, 0);
  return d;
};
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

export interface RemindChoice {
  id: string;
  label: string;
  at: Date;
}

export function remindChoices(now = new Date()): RemindChoice[] {
  const choices: RemindChoice[] = [];
  const hour = now.getHours();
  if (hour >= 7 && hour < 18) {
    const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    later.setMinutes(Math.ceil(later.getMinutes() / 15) * 15, 0, 0);
    choices.push({ id: "later", label: "Later today", at: later });
  } else if (hour < 16) {
    choices.push({ id: "evening", label: "This evening", at: atTime(now, 18) });
  }
  choices.push({ id: "tomorrow", label: "Tomorrow", at: atTime(addDays(now, 1), 9) });
  const day = now.getDay();
  const toMonday = ((8 - day) % 7) || 7;
  choices.push({ id: "next-week", label: "Next week", at: atTime(addDays(now, toMonday), 9) });
  return choices.filter((c, i) => choices.findIndex((o) => o.at.getTime() === c.at.getTime()) === i);
}

const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "today at 6:00 PM", "tomorrow at 9:00 AM", "Mon, 26 Oct at 9:00 AM". */
export function formatRemindAt(value: string, now = new Date()): string {
  const d = new Date(value);
  const days = Math.round((atTime(d, 0).getTime() - atTime(now, 0).getTime()) / 86_400_000);
  if (days === 0) return `today at ${time(d)}`;
  if (days === 1) return `tomorrow at ${time(d)}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${time(d)}`;
}

/** "just now", "5 minutes ago", "3 days ago". */
export function timeAgo(value: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"], [604800, "week"], [2592000, "month"], [31536000, "year"]];
  let pick = units[0]!;
  for (const unit of units) if (s >= unit[0]) pick = unit;
  const n = Math.floor(s / pick[0]);
  return `${n} ${pick[1]}${n === 1 ? "" : "s"} ago`;
}
