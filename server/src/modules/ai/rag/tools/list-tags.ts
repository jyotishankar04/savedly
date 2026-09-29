import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { listTags } from "../../../tag/tag.service";
import { requireUserId, type RagRuntime } from "./shared";

export const listTagsTool = tool(
  async (_input: Record<string, never>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "list_tags");
    const tags = await listTags(userId);
    return { tags: tags.map((t) => ({ name: t.name, memoryCount: t.memoryCount })) };
  },
  {
    name: "list_tags",
    description:
      "List every tag the user has, with how many memories use each — for \"what tags do I use?\", or to pick an existing tag's exact spelling before tagging or filtering (find_memories).",
    schema: z.object({}),
  },
);
