import { tool } from "@langchain/core/tools";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { memories } from "../../../../db/schema";
import { getMemoryById } from "../../../memory/memory.service";
import { semanticSearch } from "../../search/semantic-search";
import { lexicalSearch } from "../../search/lexical-search";
import { hybridSearch } from "../../search/hybrid-search";
import { excerpt, requireUserId, type RagRuntime } from "./shared";

// Cosine similarity (text-embedding-3-small) below which a memory isn't
// shown as related; search's own floor (0.2) is too loose for "like this".
const RELATED_FLOOR = 0.3;

const inputSchema = z
  .object({
    memory: z.string().min(1).optional().describe('The memory to compare against, described in the user\'s words — e.g. "my LangChain JS link", "the LeetCode one".'),
    memoryId: z.string().uuid().optional().describe("Or its id, when you already have it."),
    limit: z.number().int().positive().max(15).optional().describe("How many to return. Defaults to 6."),
  })
  .refine((v) => v.memory || v.memoryId, { message: "Say which memory: describe it (memory) or pass its memoryId." });

export const findRelatedTool = tool(
  async ({ memory: description, memoryId: givenId, limit = 6 }: z.infer<typeof inputSchema>, runtime: RagRuntime) => {
    const userId = requireUserId(runtime, "find_related");
    // Described rather than named by id: the best match is the memory meant.
    // Memory-level search (titles included), so "the LeetCode one" finds it
    // even when the memory has no text chunks.
    const memoryId =
      givenId ??
      (
        await hybridSearch({
          userId,
          query: description!,
          filterConditions: [eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)],
          candidateLimit: 5,
        })
      )[0]?.memoryId;
    if (!memoryId) throw new Error(`Couldn't find a memory matching "${description}".`);
    const memory = await getMemoryById(userId, memoryId);
    if (memory.isVaulted) throw new Error("That memory is in the user's private vault, which Ask can't open.");

    const about = [memory.title, memory.description, excerpt(memory.content, 1500), memory.tags.join(", ")].filter(Boolean).join("\n");
    // By meaning when embeddings exist; by shared words otherwise.
    // Only reasonably close matches: below this, "related" is noise.
    let hits = (await semanticSearch(userId, about, limit + 1)).filter((h) => h.score >= RELATED_FLOOR).map((h) => h.memoryId);
    if (hits.length === 0) {
      const words = [memory.title, ...memory.tags].join(" ");
      hits = (
        await lexicalSearch(words, [eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)], limit + 1)
      ).map((h) => h.memoryId);
    }
    const ids = hits.filter((id) => id !== memoryId).slice(0, limit);
    if (ids.length === 0) {
      return {
        comparedWith: memory.title,
        related: [],
        note: `Nothing else in the user's library is closely similar to "${memory.title}". Tell them that plainly. Don't search further, and don't list "${memory.title}" itself or unrelated items as similar.`,
      };
    }

    const rows = await db
      .select({ id: memories.id, title: memories.title, type: memories.type, source: memories.source, url: memories.url, description: memories.description })
      .from(memories)
      .where(and(eq(memories.userId, userId), inArray(memories.id, ids), ne(memories.id, memoryId), eq(memories.inTrash, false), eq(memories.isVaulted, false)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      comparedWith: memory.title,
      related: ids.flatMap((id) => {
        const r = byId.get(id);
        return r ? [{ id: r.id, title: r.title, type: r.type, site: r.source, url: r.url, summary: excerpt(r.description, 200) }] : [];
      }),
    };
  },
  {
    name: "find_related",
    description:
      "Find other memories similar to a given one — \"what else did I save like this?\", \"anything related to that article?\", \"more like my LangChain link\". This is the tool for any \"like / related to / similar to <memory>\" request: call it directly, describing the memory in the user's words (`memory`), or with its id. Never answer such a request with search_memories — that returns the memory itself, not ones like it. The result's `comparedWith` names the memory it matched.",
    schema: inputSchema,
  },
);
