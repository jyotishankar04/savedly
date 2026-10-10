import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { batchMoveToCollection, batchTagMemories } from "../../../batch/batch.service";
import { assertFeature } from "../../../plans/plans.service";
import { requireUserId, resolveCollectionId, type RagRuntime } from "./shared";
import { confirmFirst } from "./confirm";

const inputSchema = z
  .object({
    memoryIds: z.array(z.string().uuid()).min(1).max(100).describe("The memories to change — get ids from find_memories or search_memories."),
    addTags: z.array(z.string().min(1).max(50)).max(20).optional().describe("Tags to add to every one (existing tags are kept)."),
    removeTags: z.array(z.string().min(1).max(50)).max(20).optional().describe("Tags to take off every one."),
    moveToCollection: z.string().optional().describe("A collection (name or id) to file them all into."),
  })
  .refine((v) => v.addTags?.length || v.removeTags?.length || v.moveToCollection, {
    message: "Say what to change: addTags, removeTags or moveToCollection.",
  });

// Bulk actions are a plan feature; the message names the plan to upgrade to.
async function assertBulkOnPlan(userId: string): Promise<void> {
  try {
    await assertFeature(userId, "batchOperations");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk actions aren't on this plan.";
    throw new Error(`${message} Tell the user this and stop. Don't change the memories one at a time instead.`);
  }
}

type Input = z.infer<typeof inputSchema>;

export const updateManyMemoriesTool = tool(
  confirmFirst(
    "update_many_memories",
    async ({ memoryIds, addTags, removeTags, moveToCollection }: Input, userId) => {
      // Refused before asking: no point confirming what the plan won't allow.
      await assertBulkOnPlan(userId);
      const changes: string[] = [];
      if (addTags?.length) changes.push(`add the tag${addTags.length === 1 ? "" : "s"} ${addTags.join(", ")}`);
      if (removeTags?.length) changes.push(`remove the tag${removeTags.length === 1 ? "" : "s"} ${removeTags.join(", ")}`);
      if (moveToCollection) changes.push(`file into ${(await resolveCollectionId(userId, moveToCollection)).name}`);
      return `Change ${memoryIds.length} ${memoryIds.length === 1 ? "memory" : "memories"}: ${changes.join("; ")}`;
    },
    async ({ memoryIds, addTags, removeTags, moveToCollection }: Input, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "update_many_memories");
    await assertBulkOnPlan(userId);

    const done: string[] = [];
    if (addTags?.length) {
      await batchTagMemories(userId, { memoryIds, tagNames: addTags, mode: "add" });
      done.push(`added ${addTags.join(", ")}`);
    }
    if (removeTags?.length) {
      await batchTagMemories(userId, { memoryIds, tagNames: removeTags, mode: "remove" });
      done.push(`removed ${removeTags.join(", ")}`);
    }
    if (moveToCollection) {
      const collection = await resolveCollectionId(userId, moveToCollection);
      await batchMoveToCollection(userId, { memoryIds, collectionId: collection.id, mode: "add" });
      done.push(`filed into ${collection.name}`);
    }
    return { count: memoryIds.length, done };
    },
  ),
  {
    name: "update_many_memories",
    description:
      "Change several memories at once: add or remove tags, or file them all into a collection — \"tag all my github links as dev\", \"put these three notes in my Recipes collection\". Tell the user how many will change and get a clear yes before calling this for more than a handful. For one memory, use update_memory.",
    schema: inputSchema,
  },
);
