import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import { createMemory } from "../../../memory/memory.service";
import { ragToolContextSchema } from "./search-memories";

const inputSchema = z.object({
  type: z.enum(["note", "web"]).describe('"note" for a plain text note, "web" for a link (must include a url).'),
  title: z.string().max(500).optional().describe("A short title. If omitted, one is generated automatically once it's processed."),
  content: z.string().max(20000).optional().describe('The note\'s body text (for type "note"), or an optional caption (for type "web").'),
  url: z.string().url().optional().describe('Required when type is "web" — the link to save.'),
  tags: z.array(z.string().min(1).max(50)).max(30).optional().describe("Tags to attach, existing or new."),
});

const resultSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
});

export type CreateMemoryResult = z.infer<typeof resultSchema>;

/**
 * The agent's write path into a plain note or link — mirrors what the
 * capture UI itself does by calling the exact same service function, so
 * AI enrichment (summary, tags, embeddings) runs the same background
 * ingestion pass afterward. Deliberately limited to "note"/"web": image,
 * document, and voice memories need an actual file attachment the agent
 * has no way to produce.
 */
export const createMemoryTool = tool(
  async (
    { type, title, content, url, tags }: z.infer<typeof inputSchema>,
    runtime: ToolRuntime<unknown, typeof ragToolContextSchema>,
  ): Promise<CreateMemoryResult> => {
    const userId = runtime.context?.userId;
    if (!userId) throw new Error("create_memory: missing userId in runtime context");
    if (type === "web" && !url) throw new Error('create_memory: url is required when type is "web"');

    const created = await createMemory(userId, { type, title, content, url, tags, captureMethod: "manual" });
    return resultSchema.parse({ id: created.id, title: created.title, type: created.type });
  },
  {
    name: "create_memory",
    description:
      'Save something new for the user — a note ("save a note that says ...") or a link ("save this link: ..."). AI enrichment (summary, tags, search indexing) runs automatically in the background afterward, same as anything saved through the app itself. Do not use this to change an existing memory — that\'s update_memory.',
    schema: inputSchema,
  },
);
