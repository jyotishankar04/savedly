import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { listCollections } from "../../../collection/collection.service";
import { CollectionSource } from "../../../../db/enums";
import { requireUserId, type RagRuntime } from "./shared";

export const listCollectionsTool = tool(
  async (_input: Record<string, never>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "list_collections");
    const collections = await listCollections(userId, { includeSystem: true, isVaulted: false });
    return {
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        memoryCount: c.memoryCount,
        madeBy: c.source === CollectionSource.USER ? "user" : "Savedly",
      })),
    };
  },
  {
    name: "list_collections",
    description:
      "List the user's collections (folders) with their ids and how many memories each holds. Use it before filing memories into a collection by name (then pass the id to update_memory or update_many_memories), or for \"what collections do I have?\". To see what's inside one, use find_memories with its name.",
    schema: z.object({}),
  },
);
