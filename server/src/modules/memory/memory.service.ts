import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { attachments, collectionMemories, collections, memories, memoryTags, tags } from "../../db/schema";
import { MemoryStatus, PlanLimitType, type MemoryType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { enqueueIngestion } from "../ai/ingestion/queue";
import { getVectorStore } from "../ai/vector-store";
import { hybridSearch, SEMANTIC_SIMILARITY_FLOOR } from "../ai/search";
import { normalizeUrl } from "./normalize-url";
import { buildOkfBundle, zipOkfBundle } from "./okf-export";
import type {
  AttachmentInput,
  BrowserCaptureInput,
  CreateMemoryInput,
  ListMemoriesQuery,
  UpdateMemoryInput,
} from "./memory.schema";
import { assertFeature, assertWithinLimit } from "../plans/plans.service";

export interface MemoryListItem {
  id: string;
  type: string;
  title: string;
  url: string | null;
  description: string | null;
  source: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  inTrash: boolean;
  trashedAt: Date | null;
  isVaulted: boolean;
  eventAt: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // AI ingestion output (docs/AI_REQUIREMENTS.md) — null until the
  // background pipeline finishes for this memory.
  resourceCategory: string | null;
  inferredIntent: string | null;
  contentType: string | null;
  extractedFields: Record<string, string> | null;
  // URL capture & preview system (docs/URL_CAPTURE_AND_PREVIEW.md) — status
  // is always set (defaults to "processing"); the preview.* fields stay null
  // until ingestion runs, or forever for non-link memories.
  status: string;
  previewStatus: string | null;
  previewSource: string | null;
  platform: string | null;
  resourceType: string | null;
  canonicalUrl: string | null;
  captureMethod: string | null;
  collections: { id: string; name: string }[];
}

export interface AttachmentResponse {
  id: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

export interface MemoryDetail extends MemoryListItem {
  content: string | null;
  keywords: string[] | null;
  attachments: AttachmentResponse[];
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function attachTags(memoryIds: string[]): Promise<Map<string, string[]>> {
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

async function attachCollections(memoryIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
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

// Resolves tag names to ids for a user, creating any that don't exist yet.
export async function resolveTagIds(tx: Tx, userId: string, tagNames: string[]): Promise<string[]> {
  const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return [];

  await tx
    .insert(tags)
    .values(uniqueNames.map((name) => ({ userId, name })))
    .onConflictDoNothing({ target: [tags.userId, tags.name] });

  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, uniqueNames)));

  return rows.map((row) => row.id);
}

function toListItem(
  row: typeof memories.$inferSelect,
  memoryTagsList: string[],
  memoryCollectionsList: { id: string; name: string }[],
): MemoryListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url,
    description: row.description,
    source: row.source,
    faviconUrl: row.faviconUrl,
    previewImageUrl: row.previewImageUrl,
    isFavorite: row.isFavorite,
    isArchived: row.isArchived,
    inTrash: row.inTrash,
    trashedAt: row.trashedAt,
    isVaulted: row.isVaulted,
    eventAt: row.eventAt,
    tags: memoryTagsList,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resourceCategory: row.resourceCategory,
    inferredIntent: row.inferredIntent,
    contentType: row.contentType,
    extractedFields: row.extractedFields as Record<string, string> | null,
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
 * userId/inTrash/isArchived/isVaulted/type/isFavorite/collectionId/tag scoping shared
 * by both the plain list path and the hybrid-search path below — does NOT
 * include the `q` predicate itself, that's handled entirely differently by
 * each path (ILIKE-free now; see searchMemories). Returns null when a
 * collectionId/tag filter resolves to zero matching memory IDs, so the
 * caller can short-circuit to an empty result instead of running a
 * pointless query.
 */
async function buildFilterConditions(
  userId: string,
  query: Pick<ListMemoriesQuery, "type" | "isFavorite" | "isArchived" | "inTrash" | "isVaulted" | "collectionId" | "tag">,
): Promise<SQL[] | null> {
  const conditions: SQL[] = [
    eq(memories.userId, userId),
    eq(memories.inTrash, query.inTrash ?? false),
    eq(memories.isArchived, query.isArchived ?? false),
    // Same toggle shape as inTrash: hidden by default, shown only when
    // explicitly asked for — the vault page is the only caller that does,
    // and only once /vault/unlock has proven the PIN (enforced at the route,
    // not here — this function doesn't have access to the request).
    eq(memories.isVaulted, query.isVaulted ?? false),
  ];

  if (query.type) conditions.push(eq(memories.type, query.type as MemoryType));
  if (query.isFavorite !== undefined) conditions.push(eq(memories.isFavorite, query.isFavorite));

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
    .orderBy(desc(memories.createdAt))
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
 * Hybrid (semantic + lexical, RRF-fused) search path for a non-empty `q`.
 * candidateLimit scales with the requested page so RRF has real headroom to
 * re-rank above the page size — docs' flat 25 only really suits page 1 —
 * capped at 200 as a safety net (never hit today since the client always
 * requests page 1/limit 50).
 *
 * `total` here is ranked.length — the count of distinct memories matched
 * across both legs after the similarity floor and facet post-filter, bounded
 * by ~2x candidateLimit. It's an approximation of "how many things matched,"
 * not a true unbounded COUNT(*) — acceptable since the search page doesn't
 * currently use `total` for pagination UI.
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

  // RRF's ranked order doesn't survive a plain `IN (...)` fetch — reorder
  // via the same Map-based idiom attachTags/attachCollections already use
  // for batch-fetch-by-ID-array, rather than a SQL array_position/CASE
  // (which appears nowhere else in this codebase).
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
    content: row.content,
    keywords: row.keywords,
    attachments: attachmentRows,
  };
}

async function attachAttachments(memoryIds: string[]): Promise<Map<string, AttachmentResponse[]>> {
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
  const [tagsByMemory, collectionsByMemory, attachmentsByMemory] = await Promise.all([
    attachTags(memoryIds),
    attachCollections(memoryIds),
    attachAttachments(memoryIds),
  ]);

  return rows.map((row) => ({
    ...toListItem(row, tagsByMemory.get(row.id) ?? [], collectionsByMemory.get(row.id) ?? []),
    content: row.content,
    keywords: row.keywords,
    attachments: attachmentsByMemory.get(row.id) ?? [],
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

// --- Memory graph -----------------------------------------------------------

export interface GraphNode {
  id: string;
  title: string;
  type: string;
  resourceCategory: string | null;
  previewImageUrl: string | null;
  tags: string[];
  collections: { id: string; name: string }[];
  createdAt: Date;
}

export type GraphEdgeKind = "semantic" | "tag" | "collection";

export interface GraphEdge {
  source: string;
  target: string;
  kind: GraphEdgeKind;
  weight: number;
}

export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

// A force-directed layout stops being readable (and stops simulating cheaply)
// well before a few thousand nodes, so the graph is capped at the most recent
// slice rather than paginated — there's no useful "page 2" of a graph.
const GRAPH_NODE_LIMIT = 500;
// Per-memory nearest neighbours. Low on purpose: every node contributing its
// top-N is already 2N edges once reciprocal pairs merge, and a denser graph
// reads as a hairball rather than structure.
const GRAPH_SEMANTIC_NEIGHBORS = 5;
// Any group of n memories sharing a tag/collection is a clique of n*(n-1)/2
// edges, so broad groupings ("article", "read later") dominate the graph
// while saying nothing about two specific memories being related. At <= 8 a
// shared tag is specific enough that membership really does imply
// relatedness; past that it's a category, not a relationship.
const MAX_SHARED_GROUP_SIZE = 8;
// Sharing this many tags/collections counts as a maximally strong structural
// link. Used only to rescale those counts into the same 0..1 range semantic
// similarity already uses, so a merged edge's weight stays comparable no
// matter which signal produced it (see mergeEdges).
const MAX_SHARED_GROUP_OVERLAP = 3;

/** The node set, defined once, reused by every edge query below. */
const graphNodeCte = (userId: string) => sql`
  SELECT id, document_embedding
  FROM memories
  WHERE user_id = ${userId} AND in_trash = false AND is_vaulted = false
  ORDER BY created_at DESC
  LIMIT ${GRAPH_NODE_LIMIT}
`;

/**
 * Each node's top-K most semantically similar siblings, via the same
 * `1 - (a <=> b)` cosine-distance-to-similarity conversion the vector store
 * already uses (ai/vector-store/pgvector-store.ts) — just self-referential
 * here rather than query-text-to-memory.
 *
 * Scanning inside the CTE rather than against the HNSW-indexed table is
 * deliberate: it keeps "which memories are nodes" defined in exactly one
 * place, and at GRAPH_NODE_LIMIT the worst case is 500x500 distance
 * computations, which Postgres handles comfortably. Revisit if the node cap
 * ever rises substantially.
 */
async function semanticEdges(userId: string): Promise<GraphEdge[]> {
  const rows = await db.execute<{ source: string; target: string; score: number }>(sql`
    WITH nodes AS (${graphNodeCte(userId)})
    SELECT n.id AS source, nb.id AS target, nb.score
    FROM nodes n
    CROSS JOIN LATERAL (
      SELECT n2.id, 1 - (n.document_embedding <=> n2.document_embedding) AS score
      FROM nodes n2
      WHERE n2.id <> n.id AND n2.document_embedding IS NOT NULL
      ORDER BY n.document_embedding <=> n2.document_embedding
      LIMIT ${GRAPH_SEMANTIC_NEIGHBORS}
    ) nb
    WHERE n.document_embedding IS NOT NULL AND nb.score >= ${SEMANTIC_SIMILARITY_FLOOR}
  `);

  return rows.rows.map((row) => ({
    source: row.source,
    target: row.target,
    kind: "semantic" as const,
    weight: row.score,
  }));
}

/**
 * Memories sharing a tag (or a collection) — one edge per pair, weighted by
 * how many they share. `b.memory_id > a.memory_id` emits each pair once
 * rather than in both directions.
 */
async function sharedGroupEdges(
  userId: string,
  kind: Extract<GraphEdgeKind, "tag" | "collection">,
): Promise<GraphEdge[]> {
  const table = kind === "tag" ? sql`memory_tags` : sql`collection_memories`;
  const groupColumn = kind === "tag" ? sql`tag_id` : sql`collection_id`;

  const rows = await db.execute<{ source: string; target: string; weight: number }>(sql`
    WITH nodes AS (${graphNodeCte(userId)}),
    scoped AS (
      SELECT j.memory_id, j.${groupColumn} AS group_id
      FROM ${table} j
      INNER JOIN nodes n ON n.id = j.memory_id
    ),
    small_groups AS (
      SELECT group_id FROM scoped GROUP BY group_id HAVING COUNT(*) <= ${MAX_SHARED_GROUP_SIZE}
    )
    SELECT a.memory_id AS source, b.memory_id AS target, COUNT(*)::int AS weight
    FROM scoped a
    INNER JOIN scoped b ON b.group_id = a.group_id AND b.memory_id > a.memory_id
    WHERE a.group_id IN (SELECT group_id FROM small_groups)
    GROUP BY a.memory_id, b.memory_id
  `);

  return rows.rows.map((row) => ({
    source: row.source,
    target: row.target,
    kind,
    weight: Math.min(1, row.weight / MAX_SHARED_GROUP_OVERLAP),
  }));
}

/**
 * One line per pair, even when two memories are related several ways at once.
 * Semantic wins the styling since it's the signal the user didn't create by
 * hand; weight keeps the strongest contribution so a thick line still means
 * "strongly connected" regardless of which signal produced it — which only
 * holds because every kind's weight is already normalised to 0..1.
 */
const EDGE_KIND_PRECEDENCE: Record<GraphEdgeKind, number> = { semantic: 3, tag: 2, collection: 1 };

function mergeEdges(edgeSets: GraphEdge[][]): GraphEdge[] {
  const merged = new Map<string, GraphEdge>();

  for (const edge of edgeSets.flat()) {
    const [a, b] = edge.source < edge.target ? [edge.source, edge.target] : [edge.target, edge.source];
    const key = `${a}:${b}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { source: a, target: b, kind: edge.kind, weight: edge.weight });
      continue;
    }
    if (EDGE_KIND_PRECEDENCE[edge.kind] > EDGE_KIND_PRECEDENCE[existing.kind]) {
      existing.kind = edge.kind;
    }
    existing.weight = Math.max(existing.weight, edge.weight);
  }

  return [...merged.values()];
}

/** Nodes + edges for the /app/graph view. */
export async function getMemoryGraph(userId: string): Promise<MemoryGraph> {
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)));

  const rows = await db
    .select({
      id: memories.id,
      title: memories.title,
      type: memories.type,
      resourceCategory: memories.resourceCategory,
      previewImageUrl: memories.previewImageUrl,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false)))
    .orderBy(desc(memories.createdAt))
    .limit(GRAPH_NODE_LIMIT);

  if (rows.length === 0) return { nodes: [], edges: [], truncated: false };

  const memoryIds = rows.map((row) => row.id);
  const [tagsByMemory, collectionsByMemory, semantic, tagEdges, collectionEdges] = await Promise.all([
    attachTags(memoryIds),
    attachCollections(memoryIds),
    semanticEdges(userId),
    sharedGroupEdges(userId, "tag"),
    sharedGroupEdges(userId, "collection"),
  ]);

  const nodes: GraphNode[] = rows.map((row) => ({
    ...row,
    tags: tagsByMemory.get(row.id) ?? [],
    collections: collectionsByMemory.get(row.id) ?? [],
  }));

  return {
    nodes,
    edges: mergeEdges([semantic, tagEdges, collectionEdges]),
    truncated: total > rows.length,
  };
}

async function insertAttachments(tx: Tx, memoryId: string, input: AttachmentInput[]): Promise<void> {
  if (input.length === 0) return;
  await tx.insert(attachments).values(
    input.map((attachment) => ({
      memoryId,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    })),
  );
}

export async function createMemory(
  userId: string,
  input: CreateMemoryInput,
): Promise<MemoryDetail & { duplicateOf: { id: string; title: string } | null }> {
  await assertWithinLimit(userId, PlanLimitType.MEMORY_COUNT, 1);

  // Non-blocking duplicate detection (docs/URL_CAPTURE_AND_PREVIEW.md) — never
  // a reason to refuse the save, only a hint the client can surface.
  const normalizedUrl = normalizeUrl(input.url);
  const duplicateOf = normalizedUrl
    ? await db
        .select({ id: memories.id, title: memories.title })
        .from(memories)
        .where(
          and(
            eq(memories.userId, userId),
            eq(memories.normalizedUrl, normalizedUrl),
            eq(memories.inTrash, false),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const memoryId = await db.transaction(async (tx) => {
    // An image memory with an uploaded attachment but no explicit preview gets
    // one for free — this is what makes the list-view thumbnail show the real
    // uploaded image without any client-side change.
    const previewImageUrl =
      input.previewImageUrl ??
      (input.type === "image" ? input.attachments?.[0]?.fileUrl : undefined);

    const values: typeof memories.$inferInsert = {
      userId,
      type: input.type as MemoryType,
      title: input.title ?? "Untitled",
      url: input.url,
      normalizedUrl,
      content: input.content,
      description: input.description,
      faviconUrl: input.faviconUrl,
      previewImageUrl,
      keywords: input.keywords,
      captureMethod: input.captureMethod ?? "manual",
    };
    const [row] = await tx.insert(memories).values(values).returning({ id: memories.id });

    if (input.attachments?.length) {
      await insertAttachments(tx, row.id, input.attachments);
    }

    if (input.collectionIds?.length) {
      const owned = await tx
        .select({ id: collections.id, isVaulted: collections.isVaulted })
        .from(collections)
        .where(and(eq(collections.userId, userId), inArray(collections.id, input.collectionIds)));
      if (owned.length > 0) {
        await tx
          .insert(collectionMemories)
          .values(owned.map((collection) => ({ collectionId: collection.id, memoryId: row.id })));

        // Filing straight into a vaulted collection hides the memory too —
        // otherwise "vault this collection" wouldn't actually hide anything
        // saved into it afterward.
        if (owned.some((collection) => collection.isVaulted)) {
          await tx.update(memories).set({ isVaulted: true }).where(eq(memories.id, row.id));
        }
      }
    }

    if (input.tags?.length) {
      const tagIds = await resolveTagIds(tx, userId, input.tags);
      if (tagIds.length > 0) {
        await tx.insert(memoryTags).values(tagIds.map((tagId) => ({ memoryId: row.id, tagId })));
      }
    }

    return row.id;
  });

  // Fire-and-forget: AI ingestion runs async in the background — a queue
  // failure must never fail the create request itself.
  enqueueIngestion(memoryId).catch((err) => {
    logger.error({ memoryId, err }, "Failed to enqueue ingestion job");
  });

  const detail = await getMemoryById(userId, memoryId);
  return { ...detail, duplicateOf };
}

export async function updateMemory(
  userId: string,
  id: string,
  input: UpdateMemoryInput,
): Promise<MemoryDetail> {
  // Moving into the vault needs the plan; taking something out never does.
  if (input.isVaulted === true) await assertFeature(userId, "vault");
  await db.transaction(async (tx) => {
    const columns: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) columns.title = input.title;
    if (input.content !== undefined) columns.content = input.content;
    if (input.description !== undefined) columns.description = input.description;
    if (input.isFavorite !== undefined) columns.isFavorite = input.isFavorite;
    if (input.isArchived !== undefined) columns.isArchived = input.isArchived;
    if (input.inTrash !== undefined) {
      columns.inTrash = input.inTrash;
      // Starts (or clears) the 15-day purge clock — see trash-purge.job.ts.
      // Restoring clears it rather than leaving a stale timestamp behind,
      // so re-trashing later starts a fresh window instead of inheriting
      // however much of the old one was left.
      columns.trashedAt = input.inTrash ? new Date() : null;
    }
    // Un-vaulting (isVaulted: false) requires the vault to already be
    // unlocked — enforced by requireUnlockToUnvault at the route, before
    // this ever runs. Vaulting (true) needs no such check: hiding something
    // is always safe to do.
    if (input.isVaulted !== undefined) columns.isVaulted = input.isVaulted;
    if (input.eventAt !== undefined) columns.eventAt = input.eventAt ? new Date(input.eventAt) : null;

    const [updated] = await tx
      .update(memories)
      .set(columns)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning({ id: memories.id });

    if (!updated) {
      throw new AppError("Memory not found", 404, "NOT_FOUND");
    }

    if (input.collectionIds !== undefined) {
      await tx.delete(collectionMemories).where(eq(collectionMemories.memoryId, id));
      if (input.collectionIds.length > 0) {
        const owned = await tx
          .select({ id: collections.id, isVaulted: collections.isVaulted })
          .from(collections)
          .where(and(eq(collections.userId, userId), inArray(collections.id, input.collectionIds)));
        if (owned.length > 0) {
          await tx
            .insert(collectionMemories)
            .values(owned.map((collection) => ({ collectionId: collection.id, memoryId: id })));

          // Same inherit-on-file-in rule as createMemory.
          if (owned.some((collection) => collection.isVaulted)) {
            await tx.update(memories).set({ isVaulted: true }).where(eq(memories.id, id));
          }
        }
      }
    }

    if (input.tags !== undefined) {
      await tx.delete(memoryTags).where(eq(memoryTags.memoryId, id));
      if (input.tags.length > 0) {
        const tagIds = await resolveTagIds(tx, userId, input.tags);
        if (tagIds.length > 0) {
          await tx.insert(memoryTags).values(tagIds.map((tagId) => ({ memoryId: id, tagId })));
        }
      }
    }

    if (input.attachments !== undefined) {
      await tx.delete(attachments).where(eq(attachments.memoryId, id));
      await insertAttachments(tx, id, input.attachments);
    }
  });

  return getMemoryById(userId, id);
}

export async function deleteMemory(userId: string, id: string): Promise<void> {
  const [deleted] = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .returning({ id: memories.id });

  if (!deleted) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }

  // Only meaningful when VECTOR_STORE_PROVIDER=upstash — pgvector cleans up
  // via cascade automatically. Best-effort: an orphaned vector costs a
  // little storage, but must never block the delete response.
  getVectorStore()
    .then((store) => store.deleteMemoryVectors(id))
    .catch((err) => {
      logger.error({ memoryId: id, err }, "Failed to delete memory vectors");
    });
}

async function assertOwnedMemory(userId: string, id: string): Promise<void> {
  const [row] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);
  if (!row) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }
}

// Extension submits whatever the live DOM already gave it (POST
// /:id/browser-capture) — stored as-is, then re-run through ingestion so
// parseWebContent's merge step (buildPreview) can upgrade the preview with
// it, per docs/URL_CAPTURE_AND_PREVIEW.md.
export async function submitBrowserCapture(
  userId: string,
  id: string,
  payload: BrowserCaptureInput,
): Promise<MemoryDetail> {
  await assertOwnedMemory(userId, id);

  await db
    .update(memories)
    .set({ browserCapture: payload, updatedAt: new Date() })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));

  await enqueueIngestion(id).catch((err) => {
    logger.error({ memoryId: id, err }, "Failed to enqueue ingestion job for browser capture");
  });

  return getMemoryById(userId, id);
}

// Re-runs ingestion on demand (e.g. user clicks "retry preview"). A failed
// refresh leaves the prior preview fields untouched — upsertVectors only
// ever writes a field when the corresponding state value is non-null (see
// its `?? undefined` pattern), so nothing gets clobbered by a bad retry.
export async function refreshPreview(userId: string, id: string): Promise<MemoryDetail> {
  await assertOwnedMemory(userId, id);

  await db
    .update(memories)
    .set({ status: MemoryStatus.PROCESSING, updatedAt: new Date() })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));

  await enqueueIngestion(id).catch((err) => {
    logger.error({ memoryId: id, err }, "Failed to enqueue ingestion job for preview refresh");
  });

  return getMemoryById(userId, id);
}

export interface ProcessingStatus {
  status: string;
  previewStatus: string | null;
  fetchStatus: string | null;
}

export async function getProcessingStatus(userId: string, id: string): Promise<ProcessingStatus> {
  const [row] = await db
    .select({ status: memories.status, previewStatus: memories.previewStatus, fetchStatus: memories.fetchStatus })
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError("Memory not found", 404, "NOT_FOUND");
  }

  return row;
}
