"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon as CalendarIcon, ExternalLinkIcon as ExternalLink, StickyNote01Icon as Note } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * What create_calendar_event and update_event return (server
 * rag/tools/create-calendar-event.ts / update-event.ts): enough to show the
 * event and open it wherever it lives.
 */
export interface EventToolResult {
  memoryId: string | null;
  title: string;
  startAt: string | null;
  endAt?: string | null;
  links?: { provider: "google"; htmlLink: string }[];
}

const PROVIDER_NAME = { google: "Google Calendar" } as const;

/** The event tools' result, or null when the output isn't one. */
export function parseEventToolOutput(output: unknown): EventToolResult | null {
  try {
    const kwargs = (output as { kwargs?: { content?: string } })?.kwargs;
    if (!kwargs?.content) return null;
    const parsed = JSON.parse(kwargs.content) as EventToolResult;
    return parsed && typeof parsed.title === "string" && parsed.startAt ? parsed : null;
  } catch {
    return null;
  }
}

export function isEventToolName(name: string): boolean {
  return name === "create_calendar_event" || name === "update_event";
}

/**
 * Ask's answer after it adds or moves an event: the date, the time, and one
 * tap to open it in Google Calendar, the app's calendar, or the note.
 */
export function EventResultCard({ event, compact = false }: { event: EventToolResult; compact?: boolean }) {
  const start = new Date(event.startAt!);
  const end = event.endAt ? new Date(event.endAt) : null;
  const time = `${start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${
    end ? ` – ${end.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""
  }`;
  const buttonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted";

  return (
    <div className={cn("w-full max-w-md rounded-2xl border border-border bg-card p-3.5", compact && "p-3")}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-background">
          <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-primary">
            {start.toLocaleString(undefined, { month: "short" })}
          </span>
          <span className="mt-0.5 text-lg font-semibold leading-none tabular-nums text-foreground">{start.getDate()}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(event.links ?? []).map((link) => (
          <a key={link.provider} href={link.htmlLink} target="_blank" rel="noreferrer" className={cn(buttonClass, "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10")}>
            <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="h-3.5 w-3.5" />
            Open in {PROVIDER_NAME[link.provider]}
          </a>
        ))}
        <Link href="/app/calendar" className={buttonClass}>
          <HugeiconsIcon icon={CalendarIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
          View in your calendar
        </Link>
        {event.memoryId && (
          <Link href={`/app/memories/${event.memoryId}`} className={buttonClass}>
            <HugeiconsIcon icon={Note} strokeWidth={2.25} className="h-3.5 w-3.5" />
            Open note
          </Link>
        )}
      </div>
    </div>
  );
}
