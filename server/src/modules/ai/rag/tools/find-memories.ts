import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { listMemories } from "../../../memory/memory.service";
import { excerpt, requireUserId, resolveCollectionId, type RagRuntime } from "./shared";

const inputSchema = z.object({
  text: z.string().min(1).optional().describe("Optional words or a description to rank by (search by meaning and keywords). Leave out to list newest first."),
  type: z.enum(["web", "video", "note", "image", "document", "voice"]).optional().describe('Kind of memory: "web" = links, "document" = PDFs and files, "image", "video", "note", "voice".'),
  tag: z.string().optional().describe("Only memories with this exact tag."),
  collection: z.string().optional().describe("Only memories in this collection — its name or id."),
  site: z.string().optional().describe('Only memories from this site, e.g. "github" or "youtube.com".'),
  favoritesOnly: z.boolean().optional().describe("Only the user's favorites."),
  inTrash: z.boolean().optional().describe("List what's in the trash instead (for finding something to restore)."),
  limit: z.number().int().positive().max(25).optional().describe("How many to return. Defaults to 10."),
});

export const findMemoriesTool = tool(
  async (input: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "find_memories");
    const collection = input.collection ? await resolveCollectionId(userId, input.collection) : null;
    const result = await listMemories(userId, {
      q: input.text,
      type: input.type,
      tag: input.tag,
      collectionId: collection?.id,
      site: input.site,
      isFavorite: input.favoritesOnly ? true : undefined,
      inTrash: input.inTrash ?? false,
      page: 1,
      limit: input.limit ?? 10,
    });
    return {
      total: result.total,
      filters: { ...input, collection: collection?.name },
      memories: result.items.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        site: m.source,
        url: m.url,
        summary: excerpt(m.description, 240),
        tags: m.tags,
        savedAt: m.createdAt.toISOString(),
        eventAt: m.eventAt ? m.eventAt.toISOString() : null,
        trashedAt: m.trashedAt ? m.trashedAt.toISOString() : null,
      })),
    };
  },
  {
    name: "find_memories",
    description:
      "List the user's memories with filters — kind (links, PDFs/documents, images, videos, notes, voice), tag, collection (by name), site (\"from github\"), favorites, or the trash — optionally ranked by some text. Use for \"show me my...\", \"what's in my Recipes collection\", \"my PDFs\", \"links from youtube\", \"favorites tagged work\", \"what's in my trash\". For a free-form question about what's in the memories, prefer search_memories; for a date or date range, search_memories_by_date.",
    schema: inputSchema,
  },
);
