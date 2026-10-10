import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { deleteEventForMemory, deleteExternalCalendarEvent } from "../../../integrations/calendar/calendar.service";
import { assertTarget, eventTargetSchema } from "./event-target";
import { requireUserId, type RagRuntime } from "./shared";
import { getMemoryById } from "../../../memory/memory.service";
import { confirmFirst, shortTitle, ASKS_FIRST_NOTE } from "./confirm";

const inputSchema = z.object(eventTargetSchema);

export const removeEventTool = tool(
  confirmFirst(
    "remove_event",
    async (input: z.infer<typeof inputSchema>, userId) => {
      assertTarget(input);
      if (!input.memoryId) return "Remove an event from your Google Calendar";
      const memory = await getMemoryById(userId, input.memoryId);
      return `Remove "${shortTitle(memory.title)}" from your calendar (the saved memory is kept)`;
    },
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
  ),
  {
    name: "remove_event",
    description:
      "Take an event off the user's calendar — only when they clearly asked to remove or cancel a specific event. Find it first with list_upcoming_events. For a Savedly event, the saved memory itself is kept; only its date and any Google Calendar copy go." + ASKS_FIRST_NOTE,
    schema: inputSchema,
  },
);
