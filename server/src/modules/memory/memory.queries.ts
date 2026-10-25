import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { attachments, collectionMemories, collections, memories, memoryHighlights, memoryTags, tags } from "../../db/schema";
import { MemoryType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { hybridSearch } from "../ai/api";
import type { ListMemoriesQuery } from "./memory.schema";
import type { SocialPost } from "../ai/api";
import type { AttachmentResponse, MemoryDetail, MemoryListItem } from "./memory.types";

export async function attachTags(memoryIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (memoryIds.length === 0) return map;

  const rows = await db
    .select({ memoryId: memoryTags.memoryId, name: tags.name })
    .from(memoryTags)
    .innerJoin(tags, eq(memoryTags.tagId, tags.id))
    .where(inArray(memoryTags.memoryId, memoryIds));

  for (const row of rows) {
    const list = map.get(row.memoryId) ?? [];
    list.push(row.name);
    map.set(row.memoryId, list);
  }
  return map;
}

export async function attachCollections(memoryIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const map = new Map<string, { id: string; name: string }[]>();
  if (memoryIds.length === 0) return map;

  const rows = await db
    .select({ memoryId: collectionMemories.memoryId, id: collections.id, name: collections.name })
    .from(collectionMemories)
    .innerJoin(collections, eq(collectionMemories.collectionId, collections.id))
    .where(inArray(collectionMemories.memoryId, memoryIds));

  for (const row of rows) {
    const list = map.get(row.memoryId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.memoryId, list);
  }
  return map;
}

/**
 * A note's own opening words, as plain text: what its card shows (the AI summary comes later, or
 * never without AI).
 */
export function noteExcerpt(markdown: string | null): string | null {
  if (!markdown) return null;
  const text = markdown
    .replace(/^```[^\n]*\n?|```$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?(\[!\w+\]\s*)?/gm, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+\[ \]\s+/gm, "☐ ")
    .replace(/^\s*[-*+]\s+\[[xX]\]\s+/gm, "☑ ")
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, "• ")
    .replace(/(\*\*|__|~~|`|\*|_)/g, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/\s*\n+\s*/g, "  ")
    .trim();
  return text ? text.slice(0, 280) : null;
}

function postAuthor(post: unknown): string | null {
  const author = (post as SocialPost | null)?.author;
  return author?.handle ? `@${author.handle}` : (author?.name ?? null);
}

export function toListItem(
  row: typeof memories.$inferSelect,
  memoryTagsList: string[],
  memoryCollectionsList: { id: string; name: string }[],
): MemoryListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url,
    // A note shows its own words; everything else, what was understood about it.
    description: row.type === MemoryType.NOTE ? (noteExcerpt(row.content) ?? row.description) : row.description,
    // A post's author says more than its site ("@jack" rather than "x.com").
    source: postAuthor(row.socialPost) ?? row.source,
    faviconUrl: row.faviconUrl,
    previewImageUrl: row.previewImageUrl,
    isFavorite: row.isFavorite,
    isArchived: row.isArchived,
    inTrash: row.inTrash,
    trashedAt: row.trashedAt,
    isVaulted: row.isVaulted,
    readAt: row.readAt,
    remindAt: row.remindAt,
    remindedAt: row.remindedAt,
    hasHighlights: !!row.highlightsText,
    eventAt: row.eventAt,
    eventDurationMinutes: row.eventDurationMinutes,
    tags: memoryTagsList,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resourceCategory: row.resourceCategory,
    inferredIntent: row.inferredIntent,
    contentType: row.contentType,
    extractedFields: row.extractedFields as Record<string, string> | null,
    webResearch: row.webResearch ?? null,
    status: row.status,
    previewStatus: row.previewStatus,
    previewSource: row.previewSource,
    platform: row.platform,
    resourceType: row.resourceType,
    canonicalUrl: row.canonicalUrl,
    captureMethod: row.captureMethod,
    collections: memoryCollectionsList,
  };
}

/**
 * The scoping (userId, inTrash, isArchived, isVaulted, type, isFavorite, collectionId, tag) shared
 * by the list and hybrid-search paths; not the `q` predicate, which each path handles itself.
 * Returns null when a collectionId/tag filter matches no memories, so the caller returns empty
 * without querying.
 */
async function buildFilterConditions(
  userId: string,
  query: Pick<ListMemoriesQuery, "type" | "isFavorite" | "isArchived" | "inTrash" | "isVaulted" | "collectionId" | "tag" | "site" | "inbox" | "snoozed">,
): Promise<SQL[] | null> {
  const conditions: SQL[] = [
    eq(memories.userId, userId),
    eq(memories.inTrash, query.inTrash ?? false),
    eq(memories.isArchived, query.isArchived ?? false),
    // Like inTrash: hidden by default, shown only when asked. Only the vault page asks, and
    // /vault/unlock proving the PIN is enforced at the route.
    eq(memories.isVaulted, query.isVaulted ?? false),
  ];

  if (query.type) conditions.push(eq(memories.type, query.type as MemoryType));
  // The Inbox: unread, and not snoozed by a reminder still to come.
  if (query.inbox) conditions.push(isNull(memories.readAt), or(isNull(memories.remindAt), lte(memories.remindAt, new Date()))!);
  if (query.snoozed) conditions.push(gt(memories.remindAt, new Date()));
  if (query.isFavorite !== undefined) conditions.push(eq(memories.isFavorite, query.isFavorite));
  if (query.site) {
    const pattern = `%${query.site.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(memories.source, pattern), ilike(memories.url, pattern))!);
  }

  if (query.collectionId) {
    const rows = await db
      .select({ memoryId: collectionMemories.memoryId })
      .from(collectionMemories)
      .where(eq(collectionMemories.collectionId, query.collectionId));
    const ids = rows.map((row) => row.memoryId);
    if (ids.length === 0) return null;
    conditions.push(inArray(memories.id, ids));
  }

  if (query.tag) {
    const rows = await db
      .select({ memoryId: memoryTags.memoryId })
      .from(memoryTags)
      .innerJoin(tags, eq(memoryTags.tagId, tags.id))
      .where(and(eq(tags.userId, userId), eq(tags.name, query.tag)));
    const ids = rows.map((row) => row.memoryId);
    if (ids.length === 0) return null;
    conditions.push(inArray(memories.id, ids));
  }

  return conditions;
}

export async function listMemories(
  userId: string,
  query: ListMemoriesQuery,
): Promise<{ items: MemoryListItem[]; page: number; limit: number; total: number }> {
  const baseConditions = await buildFilterConditions(userId, query);
  if (baseConditions === null) {
    return { items: [], page: query.page, limit: query.limit, total: 0 };
  }

  const trimmedQ = query.q?.trim();
  if (trimmedQ) {
    return searchMemories(userId, query, trimmedQ, baseConditions);
  }

  const where = and(...baseConditions);

  const [{ value: total }] = await db.select({ value: count() }).from(memories).where(where);

  const rows = await db
    .select()
    .from(memories)
    .where(where)
    // The Inbox and the snoozed list read in their own order: what came back
    // (or arrived) most recently first, and the next reminder first.
    .orderBy(
      query.snoozed
        ? asc(memories.remindAt)
        : query.inbox
          ? desc(sql`coalesce(${memories.remindedAt}, ${memories.createdAt})`)
          : desc(memories.createdAt),
    )
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const memoryIds = rows.map((row) => row.id);
  const [tagsByMemory, collectionsByMemory] = await Promise.all([
    attachTags(memoryIds),
    attachCollections(memoryIds),
  ]);
  const items = rows.map((row) =>
    toListItem(row, tagsByMemory.get(row.id) ?? [], collectionsByMemory.get(row.id) ?? []),
  );

  return { items, page: query.page, limit: query.limit, total };
}

/**
 * Hybrid (semantic + lexical, RRF) search for a non-empty `q`. candidateLimit scales with the page so RRF has headroom, capped at 200.
 * `total` is ranked.length: distinct memories matched across both legs after the floor and facet filter (about 2x candidateLimit). It's an approximation, fine because the search page doesn't paginate on it.
 */
async function searchMemories(
  userId: string,
  query: ListMemoriesQuery,
  trimmedQ: string,
  baseConditions: SQL[],
): Promise<{ items: MemoryListItem[]; page: number; limit: number; total: number }> {
  const candidateLimit = Math.min(200, Math.max(25, query.page * query.limit * 2));

  const ranked = await hybridSearch({
    userId,
    query: trimmedQ,
    filterConditions: baseConditions,
    candidateLimit,
  });

  const total = ranked.length;
  const start = (query.page - 1) * query.limit;
  const pageIds = ranked.slice(start, start + query.limit).map((r) => r.memoryId);

  if (pageIds.length === 0) {
    return { items: [], page: query.page, limit: query.limit, total };
  }

  const rows = await db
    .select()
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, pageIds)));

  // RRF's order doesn't survive a plain `IN (...)` fetch, so reorder with a Map, as
  // attachTags/attachCollections do, rather than array_position/CASE.
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = pageIds
    .map((id) => rowsById.get(id))
    .filter((row): row is typeof rows[number] => row !== undefined);

  const [tagsByMemory, collectionsByMemory] = await Promise.all([
    attachTags(pageIds),
    attachCollections(pageIds),
  ]);
  const items = orderedRows.map((row) =>
    toListItem(row, tagsByMemory.get(row.id) ?? [], collectionsByMemory.get(row.id) ?? []),
  );

  return { items, page: query.page, limit: query.limit, total };
}

export async function getMemoryById(userId: string, id: string): Promise<MemoryDetail> {
  const [row] = await db
    .select()
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }

  const [tagsByMemory, collectionsByMemory] = await Promise.all([
    attachTags([row.id]),
    attachCollections([row.id]),
  ]);

  const highlightRows = row.highlightsText
    ? await db
        .select({ id: memoryHighlights.id, text: memoryHighlights.text, color: memoryHighlights.color, note: memoryHighlights.note, createdAt: memoryHighlights.createdAt })
        .from(memoryHighlights)
        .where(eq(memoryHighlights.memoryId, row.id))
        .orderBy(asc(memoryHighlights.createdAt))
    : [];

  const attachmentRows = await db
    .select({
      id: attachments.id,
      fileUrl: attachments.fileUrl,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.memoryId, row.id));

  return {
    ...toListItem(row, tagsByMemory.get(row.id) ?? [], collectionsByMemory.get(row.id) ?? []),
    highlights: highlightRows,
    content: row.content,
    keywords: row.keywords,
    attachments: attachmentRows,
    socialPost: (row.socialPost as SocialPost | null) ?? null,
  };
}

export async function attachAttachments(memoryIds: string[]): Promise<Map<string, AttachmentResponse[]>> {
  const map = new Map<string, AttachmentResponse[]>();
  if (memoryIds.length === 0) return map;

  const rows = await db
    .select({
      memoryId: attachments.memoryId,
      id: attachments.id,
      fileUrl: attachments.fileUrl,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(inArray(attachments.memoryId, memoryIds));

  for (const row of rows) {
    const list = map.get(row.memoryId) ?? [];
    list.push({ id: row.id, fileUrl: row.fileUrl, fileSize: row.fileSize, mimeType: row.mimeType, createdAt: row.createdAt });
    map.set(row.memoryId, list);
  }
  return map;
}

/** Highlights for many memories at once, oldest first, for the export. */
export async function attachHighlights(memoryIds: string[]): Promise<Map<string, MemoryDetail["highlights"]>> {
  const map = new Map<string, MemoryDetail["highlights"]>();
  if (memoryIds.length === 0) return map;
  const rows = await db
    .select({ memoryId: memoryHighlights.memoryId, id: memoryHighlights.id, text: memoryHighlights.text, color: memoryHighlights.color, note: memoryHighlights.note, createdAt: memoryHighlights.createdAt })
    .from(memoryHighlights)
    .where(inArray(memoryHighlights.memoryId, memoryIds))
    .orderBy(asc(memoryHighlights.createdAt));
  for (const { memoryId, ...highlight } of rows) map.set(memoryId, [...(map.get(memoryId) ?? []), highlight]);
  return map;
}
