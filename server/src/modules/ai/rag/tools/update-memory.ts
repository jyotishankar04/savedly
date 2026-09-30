import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { updateMemory } from "../../../memory/memory.service";
import { ragToolContextSchema } from "./search-memories";
import { takeOrganizeSlot } from "./shared";
import { planHasFeature } from "../../../plans/plans.service";

const inputSchema = z.object({
  memoryId: z.string().uuid().describe("The id of the memory to update — find it with search_memories first."),
  title: z.string().max(500).optional(),
  content: z.string().max(20000).optional().describe("Replaces the memory's body/content entirely."),
  description: z.string().optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).optional().describe("Replaces the memory's full tag list — include any existing tags you want kept, not just new ones."),
  collectionIds: z.array(z.string().uuid()).max(50).optional().describe("Replaces which collections this memory belongs to. Use create_collection first if the target collection doesn't exist yet."),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const resultSchema = z.object({ id: z.string(), title: z.string() });
export type UpdateMemoryResult = z.infer<typeof resultSchema>;

export const updateMemoryTool = tool(
  async (
    { memoryId, ...patch }: z.infer<typeof inputSchema>,
    runtime: ToolRuntime<unknown, typeof ragToolContextSchema>,
  ): Promise<UpdateMemoryResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("update_memory: missing userId in runtime context");

    // Without bulk actions on the plan, one tag/collection change per
    // question: "tag all my links" can't become the same edit made one by one.
    const organizing = patch.tags !== undefined || patch.collectionIds !== undefined;
    if (organizing && !(await planHasFeature(userId, "batchOperations")) && !takeOrganizeSlot(runtime.context?.turnId)) {
      throw new Error(
        "Changing tags or collections on several memories in one go needs bulk actions, which the user's plan doesn't include (they're on Lite and up). Tell the user that and stop; they can still ask for one memory at a time.",
      );
    }

    const updated = await updateMemory(userId, memoryId, patch);
    return resultSchema.parse({ id: updated.id, title: updated.title });
  },
  {
    name: "update_memory",
    description:
      "Edit an existing memory the user asked you to change — e.g. \"rename that note\", \"add the tag 'work' to it\", \"mark it as a favorite\", \"file it under my Recipes collection\", \"update the content to say ...\". Always find the memory with search_memories first to get its id. Only pass the fields that should change — omitted fields are left as they are, except `tags`/`collectionIds`, which replace the full list when given.",
    schema: inputSchema,
  },
);
