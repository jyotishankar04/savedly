import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, memories } from "../../db/schema";
import { buildOkfBundle, zipOkfBundle } from "./okf-export";
import type { SocialPost } from "../ai/api";
import type { MemoryDetail } from "./memory.types";
import { attachAttachments, attachCollections, attachHighlights, attachTags, toListItem } from "./memory.queries";

/**
 * Every non-trashed memory, full detail (content/keywords/attachments
 * included) — unlike listMemories, no pagination, since this backs a
 * single JSON-dump download, not a browsing UI.
 */
export async function exportAllMemories(userId: string): Promise<MemoryDetail[]> {
  const rows = await db
    .select()
    .from(memories)
    // Vaulted memories are excluded unconditionally here — export is a
    // Pro data-portability feature, not a vault-aware surface, so it never
    // includes vault contents regardless of whether the vault happens to
    // be unlocked in this request.
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)))
    .orderBy(desc(memories.createdAt));

  const memoryIds = rows.map((row) => row.id);
  const [tagsByMemory, collectionsByMemory, attachmentsByMemory, highlightsByMemory] = await Promise.all([
    attachTags(memoryIds),
    attachCollections(memoryIds),
    attachAttachments(memoryIds),
    attachHighlights(memoryIds),
  ]);

  return rows.map((row) => ({
    ...toListItem(row, tagsByMemory.get(row.id) ?? [], collectionsByMemory.get(row.id) ?? []),
    highlights: highlightsByMemory.get(row.id) ?? [],
    content: row.content,
    keywords: row.keywords,
    attachments: attachmentsByMemory.get(row.id) ?? [],
    // The export keeps what was read from a post, transcript included.
    socialPost: (row.socialPost as SocialPost | null) ?? null,
  }));
}

/** The same library as exportAllMemories, as a zipped Open Knowledge Format bundle (see okf-export.ts). Vaulted collections are left out, like vaulted memories. */
export async function exportOkfBundle(userId: string): Promise<Uint8Array> {
  const [items, collectionRows] = await Promise.all([
    exportAllMemories(userId),
    db
      .select({ id: collections.id, name: collections.name, description: collections.description, createdAt: collections.createdAt })
      .from(collections)
      .where(and(eq(collections.userId, userId), eq(collections.isVaulted, false)))
      .orderBy(collections.name),
  ]);
  return zipOkfBundle(buildOkfBundle(items, collectionRows));
}
