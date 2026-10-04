/**
 * Client-side "Add to calendar" helpers — no calendar OAuth anywhere. Google
 * and Outlook both support a plain "quick add" URL, and every other
 * calendar app (Apple Calendar, Thunderbird, etc.) can open a downloaded
 * .ics file, so a one-click add works everywhere without ever asking for
 * calendar access.
 */

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  url?: string | null;
  /** ISO datetime string. */
  start: string;
  /** Defaults to one hour after `start` when omitted. */
  end?: string;
}

function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function defaultEnd(start: string): string {
  return new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const end = event.end ?? defaultEnd(event.start);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toUtcStamp(event.start)}/${toUtcStamp(end)}`,
  });
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  if (event.url) params.set("location", event.url);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEventInput): string {
  const end = event.end ?? defaultEnd(event.start);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: new Date(event.start).toISOString(),
    enddt: new Date(end).toISOString(),
  });
  const body = [event.description, event.url].filter(Boolean).join("\n\n");
  if (body) params.set("body", body);
  if (event.url) params.set("location", event.url);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsContent(event: CalendarEventInput): string {
  const end = event.end ?? defaultEnd(event.start);
  const description = [event.description, event.url].filter(Boolean).join("\\n\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Memora//Add to Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@memora`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(event.start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/** Triggers a browser download of the given text as a file — works for the .ics case without any server round-trip. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/calendar"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
