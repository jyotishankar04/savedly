import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createStandaloneCalendarEvent } from "../../../integrations/calendar/calendar.service";
import { confirmFirst, shortTitle, whenText } from "./confirm";
import type { RagRuntime } from "./shared";

const inputSchema = z.object({
  title: z.string().min(1).max(500).describe("A short, clear title for the event — e.g. \"Meeting with John\", \"Dentist appointment\"."),
  description: z.string().max(2000).optional().describe("Optional extra detail about the event."),
  startAt: z
    .string()
    .datetime()
    .describe(
      "Absolute ISO 8601 start date/time, resolved from the user's request using the current date given in your system prompt — never pass a relative phrase like \"tomorrow\" or \"next Friday\" as-is.",
    ),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional()
    .describe("How long the event lasts, in minutes. Defaults to 60 if the user didn't say."),
});

// Also what the Ask UI turns into an event card (date, time, and buttons to
// open it in Google Calendar, the app's calendar, and the note).
const resultSchema = z.object({
  memoryId: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  pushedTo: z.array(z.enum(["google"])),
  notConnected: z.array(z.enum(["google"])),
  links: z.array(z.object({ provider: z.enum(["google"]), htmlLink: z.string() })),
});

export type CreateCalendarEventResult = z.infer<typeof resultSchema>;

/**
 * The agent's write path into the calendar feature — mirrors the "New
 * event" dialog's POST /integrations/calendar/events by calling the exact
 * same service function, so a user asking "add a meeting tomorrow at 3pm"
 * and one filling in the app's own form get identical behavior (saved as a
 * real Savedly memory, pushed to any connected calendar).
 */
export const createCalendarEventTool = tool(
  confirmFirst(
    "create_calendar_event",
    async ({ title, startAt, durationMinutes }: z.infer<typeof inputSchema>, userId) =>
      `Add "${shortTitle(title)}" to your calendar on ${await whenText(userId, startAt)}${durationMinutes ? `, for ${durationMinutes} minutes` : ""}`,
    async (
    { title, description, startAt, durationMinutes }: z.infer<typeof inputSchema>,
    runtime: RagRuntime,
  ): Promise<CreateCalendarEventResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("create_calendar_event: missing userId in runtime context");

    const result = await createStandaloneCalendarEvent(userId, { title, description, startAt, durationMinutes });
    return resultSchema.parse(result);
  },
  ),
  {
    name: "create_calendar_event",
    description:
      "Create a calendar event, reminder, or appointment for the user — e.g. \"add a meeting with John tomorrow at 3pm\", \"remind me to call the dentist next Monday at 10am\", \"schedule lunch with Sarah on Friday at noon\". Resolve any relative date/time to an absolute ISO 8601 datetime yourself, using today's date given in your system prompt, before calling this. The event is always saved in Savedly with its date attached, and automatically synced to Google Calendar if the user has connected it — tell the user which of those it was pushed to (from `pushedTo`) and, if any weren't connected (`notConnected`), mention they can connect one from the Integrations page for it to sync there too. The app shows the event as a card with buttons to open it, so don't write out its links.",
    schema: inputSchema,
  },
);
