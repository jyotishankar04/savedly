import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { eventLinksForMemory, updateEventForMemory, updateExternalCalendarEvent } from "../../../integrations/calendar/calendar.service";
import { getMemoryById } from "../../../memory/memory.service";
import { assertTarget, eventTargetSchema } from "./event-target";
import { requireUserId, type RagRuntime } from "./shared";
import { confirmFirst, shortTitle, whenText } from "./confirm";

const inputSchema = z.object({
  ...eventTargetSchema,
  start: z.string().datetime({ offset: true }).optional().describe("New start as ISO 8601 with the user's UTC offset, e.g. 2026-10-02T16:00:00+05:30."),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().describe("New length in minutes."),
  title: z.string().min(1).max(500).optional().describe("New title."),
});

export const updateEventTool = tool(
  confirmFirst(
    "update_event",
    async (input: z.infer<typeof inputSchema>, userId) => {
      assertTarget(input);
      const name = input.memoryId ? shortTitle((await getMemoryById(userId, input.memoryId)).title) : shortTitle(input.title);
      const changes: string[] = [];
      if (input.start) changes.push(`move it to ${await whenText(userId, input.start)}`);
      if (input.durationMinutes) changes.push(`make it ${input.durationMinutes} minutes long`);
      if (input.title && input.memoryId) changes.push(`rename it to "${shortTitle(input.title)}"`);
      return `Change the event "${name}": ${changes.join("; ") || "update its details"}`;
    },
    async (input: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "update_event");
    assertTarget(input);
    const startAt = input.start ? new Date(input.start).toISOString() : undefined;

    // Same shape as create_calendar_event's result, so the Ask UI shows the
    // moved event as a card too.
    if (input.memoryId) {
      // Updates the memory's date and any synced Google Calendar copy.
      await updateEventForMemory(userId, input.memoryId, { title: input.title, startAt, durationMinutes: input.durationMinutes });
      const memory = await getMemoryById(userId, input.memoryId);
      const start = memory.eventAt ? memory.eventAt.toISOString() : (startAt ?? null);
      return {
        updated: true,
        memoryId: memory.id,
        title: memory.title,
        startAt: start,
        endAt: start ? new Date(new Date(start).getTime() + (input.durationMinutes ?? 60) * 60_000).toISOString() : null,
        links: await eventLinksForMemory(userId, memory.id),
      };
    }
    if (!startAt || !input.title) {
      throw new Error("To change a calendar-only event, give its new start and title (from list_upcoming_events, changed as asked).");
    }
    const endAt = new Date(new Date(startAt).getTime() + (input.durationMinutes ?? 60) * 60_000).toISOString();
    await updateExternalCalendarEvent(userId, input.provider!, input.externalEventId!, { title: input.title, description: null, startAt, endAt });
    return { updated: true, memoryId: null, title: input.title, startAt, endAt, provider: input.provider, links: [] };
  },
  ),
  {
    name: "update_event",
    description:
      "Reschedule or rename an event — \"move team sync to 4 pm\", \"push the dentist to next Tuesday\", \"rename it to Planning\". Find it first with list_upcoming_events. Changes to a Savedly event also update its Google Calendar copy. For a calendar-only event, pass its full new start and title.",
    schema: inputSchema,
  },
);
