import { z } from "zod";

// How update_event and remove_event name an event: by the memory behind it
// (events saved in SaveForLatter, synced or not), or by a Google/Outlook
// event's own id when no memory backs it. Both come from list_upcoming_events.
export const eventTargetSchema = {
  memoryId: z.string().uuid().optional().describe("For an event saved in SaveForLatter: its memoryId from list_upcoming_events."),
  provider: z.enum(["google", "microsoft"]).optional().describe("For a calendar-only event (no memoryId): which calendar it's in."),
  externalEventId: z.string().optional().describe("For a calendar-only event: its externalEventId from list_upcoming_events."),
};

export function assertTarget(input: { memoryId?: string; provider?: string; externalEventId?: string }): void {
  if (!input.memoryId && !(input.provider && input.externalEventId)) {
    throw new Error("Say which event: its memoryId, or provider + externalEventId from list_upcoming_events.");
  }
}
