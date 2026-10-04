import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { createCollection, listCollections } from "../../../collection/collection.service";
import { collectionNameKey } from "../../ingestion/nodes/organize-collection";
import { ragToolContextSchema } from "./search-memories";

const inputSchema = z.object({
  name: z.string().min(1).max(100).describe("A short, clear collection name."),
  icon: z.string().max(50).optional().describe('A single emoji to represent the collection, e.g. "📚". Defaults to a plain folder icon if omitted.'),
  description: z.string().max(500).optional(),
});

const resultSchema = z.object({ id: z.string(), name: z.string(), alreadyExisted: z.boolean() });
export type CreateCollectionResult = z.infer<typeof resultSchema>;

export const createCollectionTool = tool(
  async (
    { name, icon, description }: z.infer<typeof inputSchema>,
    runtime: ToolRuntime<unknown, typeof ragToolContextSchema>,
  ): Promise<CreateCollectionResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("create_collection: missing userId in runtime context");

    // "Make a Birthdays collection" when "Birthdays" (or "Birthday") is already there: use that one instead of a twin.
    const existing = (await listCollections(userId, { includeSystem: true, isVaulted: false })).find(
      (c) => collectionNameKey(c.name) === collectionNameKey(name),
    );
    if (existing) return resultSchema.parse({ id: existing.id, name: existing.name, alreadyExisted: true });

    const created = await createCollection(userId, { name, icon: icon ?? "folder-outline", description });
    return resultSchema.parse({ id: created.id, name: created.name, alreadyExisted: false });
  },
  {
    name: "create_collection",
    description:
      "Create a new collection (folder) for the user to organize their memories into — e.g. \"make a collection called Recipes\". Doesn't move any memories into it by itself; use update_memory's collectionIds afterward (with this tool's returned id) if the user also wants an existing memory filed into it. If a collection with that name already exists, it's returned (alreadyExisted: true) instead of making a duplicate.",
    schema: inputSchema,
  },
);
