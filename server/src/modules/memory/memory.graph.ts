import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { SEMANTIC_SIMILARITY_FLOOR } from "../ai/api";
import { attachCollections, attachTags } from "./memory.queries";

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
