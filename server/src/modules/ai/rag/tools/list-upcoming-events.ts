import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { listEvents } from "../../../integrations/calendar/calendar.service";
import { localDate, startOfLocalDay, userTimeZone } from "../../../../shared/utils/time-zone";
import { requireUserId, type RagRuntime } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

const inputSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("First day to include, YYYY-MM-DD in the user's time zone. Defaults to today."),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Last day to include, YYYY-MM-DD. Defaults to 7 days after `from`."),
});

export const listUpcomingEventsTool = tool(
  async ({ from, to }: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "list_upcoming_events");
    const timeZone = await userTimeZone(userId);
    const firstDay = from ?? localDate(timeZone);
    const lastDay = to ?? new Date(new Date(`${firstDay}T00:00:00Z`).getTime() + 6 * DAY_MS).toISOString().slice(0, 10);
    const dayAfterLast = new Date(new Date(`${lastDay}T00:00:00Z`).getTime() + DAY_MS).toISOString().slice(0, 10);

    const events = await listEvents(userId, { from: startOfLocalDay(firstDay, timeZone), to: startOfLocalDay(dayAfterLast, timeZone) });
    const local = (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
        new Date(iso),
      );
    // All-day dates are midnight UTC, not instants: format them in UTC so they don't shift a day.
    const utcDay = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
    const allDayLabel = (startIso: string, endIso: string) => {
      const lastDay = new Date(new Date(endIso).getTime() - DAY_MS).toISOString();
      return lastDay.slice(0, 10) <= startIso.slice(0, 10) ? `${utcDay(startIso)}, all day` : `${utcDay(startIso)} – ${utcDay(lastDay)}, all day`;
    };
    return {
      timeZone,
      from: firstDay,
      to: lastDay,
      events: events
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .map((e) => ({
          title: e.title,
          start: e.startAt,
          end: e.endAt,
          when: e.allDay ? allDayLabel(e.startAt, e.endAt) : `${local(e.startAt)} – ${local(e.endAt)}`,
          from: e.source === "savedly" ? "saved in Savedly" : "Google Calendar",
          memoryId: e.memoryId,
          provider: e.source === "savedly" ? null : e.source,
          externalEventId: e.externalEventId,
        })),
    };
  },
  {
    name: "list_upcoming_events",
    description:
      "List the user's events in a date range — events saved in Savedly plus their connected Google Calendar — for \"what's on this week?\", \"am I free on Friday?\", \"what's next?\". Defaults to the next 7 days. Each event carries the ids update_event and remove_event need.",
    schema: inputSchema,
  },
);
