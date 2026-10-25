import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getMemoryById, updateMemory } from "../../../memory/api";
import { requireUserId, type RagRuntime } from "./shared";

const inputSchema = z.object({
  memoryId: z.string().uuid().describe("The memory's id, from search_memories or find_memories."),
  remindAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe("When to bring it back, in the user's time zone with its offset, e.g. 2026-10-24T09:00:00+05:30. Null cancels the reminder."),
});

/**
 * "Remind me about this on Friday": snoozes a memory until then, then it returns to the top of the
 * Inbox with a notification (and email unless off). No confirmation: nothing is lost and it can be
 * changed.
 */
export const setReminderTool = tool(
  async ({ memoryId, remindAt }: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "set_reminder");
    const memory = await getMemoryById(userId, memoryId);
    if (remindAt && new Date(remindAt).getTime() < Date.now() - 60_000) {
      return { done: false, message: "That time has already passed. Ask the user for a time in the future." };
    }
    await updateMemory(userId, memoryId, { remindAt });
    return remindAt ? { done: true, memory: memory.title, remindAt } : { done: true, memory: memory.title, cancelled: true };
  },
  {
    name: "set_reminder",
    description:
      "Set or cancel a reminder on a memory: \"remind me about this tomorrow\", \"bring the React article back on Friday\". Until then it's hidden from the Inbox; then it comes back with a notification. Morning means 9:00, evening 18:00, in the user's time zone. Say when it will come back, in plain words.",
    schema: inputSchema,
  },
);
