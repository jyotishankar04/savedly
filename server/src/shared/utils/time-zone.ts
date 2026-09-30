import { eq } from "drizzle-orm";
import { db } from "../../db";
import { userSettings } from "../../db/schema";

// The user's own time zone, so "3 pm", "tomorrow" and "yesterday" mean what
// they mean where the user is. Set from the browser (user_settings.timezone);
// UTC when it isn't known yet.

export async function userTimeZone(userId: string): Promise<string> {
  const [row] = await db.select({ timezone: userSettings.timezone }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return row?.timezone || "UTC";
}

/** "Tuesday, September 29, 2026 at 6:42 PM GMT+05:30", right now in that zone. */
export function localNow(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "longOffset",
  }).format(now);
}

/** Today's date in that zone, as YYYY-MM-DD. */
export function localDate(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The zone's UTC offset at `at` as "+05:30" ("Z" for UTC). */
export function utcOffset(timeZone: string, at = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  const offset = name?.replace("GMT", "") ?? "";
  return offset === "" ? "Z" : offset;
}

function offsetMinutes(timeZone: string, at: Date): number {
  const offset = utcOffset(timeZone, at);
  if (offset === "Z") return 0;
  const [, sign, hours, minutes] = offset.match(/([+-])(\d{2}):?(\d{2})?/) ?? [];
  const total = Number(hours ?? 0) * 60 + Number(minutes ?? 0);
  return sign === "-" ? -total : total;
}

/** The instant a local calendar day (YYYY-MM-DD) starts in that zone. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);
  return new Date(utcMidnight.getTime() - offsetMinutes(timeZone, utcMidnight) * 60_000);
}
