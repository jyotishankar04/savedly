import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getMemoryById, updateMemory } from "../../../memory/memory.service";
import { confirmFirst, shortTitle, ASKS_FIRST_NOTE } from "./confirm";
import type { RagRuntime } from "./shared";

const inputSchema = z.object({
  memoryId: z.string().uuid().describe("The id of the memory to delete — find it with search_memories first."),
});

const resultSchema = z.object({ id: z.string(), title: z.string() });
export type DeleteMemoryResult = z.infer<typeof resultSchema>;

/**
 * Moves to Trash (recoverable for 15 days) — the same action as the app's
 * own delete button on the memories list — never a permanent hard delete.
 * Permanently deleting is a manual, confirmation-gated action only
 * available from the Trash page itself, deliberately not exposed here: an
 * agent acting on a misread request should never cause unrecoverable loss.
 */
export const deleteMemoryTool = tool(
  confirmFirst(
    "delete_memory",
    async ({ memoryId }: z.infer<typeof inputSchema>, userId) => {
      const memory = await getMemoryById(userId, memoryId);
      return `Move "${shortTitle(memory.title)}" to Trash`;
    },
    async ({ memoryId }: z.infer<typeof inputSchema>, runtime: RagRuntime): Promise<DeleteMemoryResult> => {
      const userId = runtime.context?.userId;
      if (!userId) throw new Error("delete_memory: missing userId in runtime context");

      const updated = await updateMemory(userId, memoryId, { inTrash: true });
      return resultSchema.parse({ id: updated.id, title: updated.title });
    },
  ),
  {
    name: "delete_memory",
    description:
      "Delete a memory the user asked you to remove — e.g. \"delete that note\", \"remove the LangChain link\". Moves it to Trash, where it's recoverable for 15 days before being permanently removed — never an unrecoverable delete. Always find the memory with search_memories first to confirm you have the right one before calling this, especially if the request is at all ambiguous." + ASKS_FIRST_NOTE,
    schema: inputSchema,
  },
);
