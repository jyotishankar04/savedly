import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { updateEventForMemory, updateExternalCalendarEvent } from "../../../integrations/calendar/calendar.service";
import { assertTarget, eventTargetSchema } from "./event-target";
import { requireUserId, type RagRuntime } from "./shared";

const inputSchema = z.object({
  ...eventTargetSchema,
  start: z.string().datetime({ offset: true }).optional().describe("New start as ISO 8601 with the user's UTC offset, e.g. 2026-10-02T16:00:00+05:30."),
  durationMinutes: z.number().int().positive().max(24 * 60).optional().describe("New length in minutes."),
  title: z.string().min(1).max(500).optional().describe("New title."),
});

export const updateEventTool = tool(
  async (input: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "update_event");
    assertTarget(input);
    const startAt = input.start ? new Date(input.start).toISOString() : undefined;

    if (input.memoryId) {
      // Updates the memory's date and any synced Google/Outlook copy.
      await updateEventForMemory(userId, input.memoryId, { title: input.title, startAt, durationMinutes: input.durationMinutes });
      return { updated: true, memoryId: input.memoryId, start: startAt ?? null };
    }
    if (!startAt || !input.title) {
      throw new Error("To change a calendar-only event, give its new start and title (from list_upcoming_events, changed as asked).");
    }
    const endAt = new Date(new Date(startAt).getTime() + (input.durationMinutes ?? 60) * 60_000).toISOString();
    await updateExternalCalendarEvent(userId, input.provider!, input.externalEventId!, { title: input.title, description: null, startAt, endAt });
    return { updated: true, provider: input.provider, start: startAt, end: endAt };
  },
  {
    name: "update_event",
    description:
      "Reschedule or rename an event — \"move team sync to 4 pm\", \"push the dentist to next Tuesday\", \"rename it to Planning\". Find it first with list_upcoming_events. Changes to a SaveForLatter event also update its Google/Outlook copy. For a calendar-only event, pass its full new start and title.",
    schema: inputSchema,
  },
);
