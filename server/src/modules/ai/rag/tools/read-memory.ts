import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getMemoryById } from "../../../memory/memory.service";
import { excerpt, requireUserId, type RagRuntime } from "./shared";

const inputSchema = z.object({
  memoryId: z.string().uuid().describe("The id of the memory to read — from search_memories, find_memories or another tool's results."),
});

const CONTENT_LIMIT = 8000;

export const readMemoryTool = tool(
  async ({ memoryId }: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "read_memory");
    const memory = await getMemoryById(userId, memoryId);
    // The vault stays closed to Ask, and trashed items are only listed, not read.
    if (memory.isVaulted) throw new Error("That memory is in the user's private vault, which Ask can't open.");
    if (memory.inTrash) throw new Error("That memory is in the trash. Restore it first (restore_memories) to read it.");

    return {
      id: memory.id,
      title: memory.title,
      type: memory.type,
      url: memory.url,
      site: memory.source,
      summary: memory.description,
      content: excerpt(memory.content, CONTENT_LIMIT),
      tags: memory.tags,
      collections: memory.collections.map((c) => c.name),
      isFavorite: memory.isFavorite,
      eventAt: memory.eventAt ? memory.eventAt.toISOString() : null,
      savedAt: memory.createdAt.toISOString(),
      details: memory.extractedFields ?? {},
      attachments: memory.attachments.map((a) => ({ fileUrl: a.fileUrl, mimeType: a.mimeType })),
    };
  },
  {
    name: "read_memory",
    description:
      "Read one saved memory in full: its complete text (not just a snippet), summary, tags, collections, event date and details the app pulled out of it. Use it before quoting, summarizing or answering precise questions about a specific memory (\"what exactly did my note say about...\", \"what's the address in that saved page?\"). Find the id first with search_memories or find_memories.",
    schema: inputSchema,
  },
);
