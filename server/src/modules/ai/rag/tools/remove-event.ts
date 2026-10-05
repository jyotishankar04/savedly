import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { deleteEventForMemory, deleteExternalCalendarEvent } from "../../../integrations/calendar/calendar.service";
import { assertTarget, eventTargetSchema } from "./event-target";
import { requireUserId, type RagRuntime } from "./shared";

const inputSchema = z.object(eventTargetSchema);

export const removeEventTool = tool(
  async (input: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "remove_event");
    assertTarget(input);
    if (input.memoryId) {
      // Removes it from the calendar (and any synced copy); the saved memory stays.
      await deleteEventForMemory(userId, input.memoryId);
      return { removed: true, memoryKept: true };
    }
    await deleteExternalCalendarEvent(userId, input.provider!, input.externalEventId!);
    return { removed: true, provider: input.provider };
  },
  {
    name: "remove_event",
    description:
      "Take an event off the user's calendar — only when they clearly asked to remove or cancel a specific event. Find it first with list_upcoming_events. For a SaveForLatter event, the saved memory itself is kept; only its date and any Google Calendar copy go.",
    schema: inputSchema,
  },
);
