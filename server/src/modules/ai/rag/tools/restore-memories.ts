import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { updateMemory } from "../../../memory/memory.service";
import { requireUserId, type RagRuntime } from "./shared";

const inputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1).max(20).describe("Ids of trashed memories to restore — find them with find_memories and inTrash: true."),
});

export const restoreMemoriesTool = tool(
  async ({ memoryIds }: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "restore_memories");
    const restored: { id: string; title: string }[] = [];
    const failed: { id: string; reason: string }[] = [];
    // One at a time, like the app's own Restore button, so it isn't a bulk
    // action (those are a plan feature).
    for (const id of memoryIds) {
      try {
        const memory = await updateMemory(userId, id, { inTrash: false });
        restored.push({ id: memory.id, title: memory.title });
      } catch (err) {
        failed.push({ id, reason: err instanceof Error ? err.message : "Couldn't restore it" });
      }
    }
    return { restored, failed };
  },
  {
    name: "restore_memories",
    description:
      "Take memories out of the trash, back into the library — \"restore the note I deleted\", \"undo deleting that link\". Find them first with find_memories (inTrash: true). Items stay in the trash for 15 days before they're gone for good.",
    schema: inputSchema,
  },
);
