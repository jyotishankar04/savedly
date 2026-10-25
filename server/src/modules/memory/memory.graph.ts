import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { memories } from "../../db/schema";
import { SEMANTIC_SIMILARITY_FLOOR } from "../ai/api";
import { attachCollections, attachTags } from "./memory.queries";

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

// A force-directed layout stops being readable and cheap well before thousands of nodes, so cap at
// the most recent slice; a graph has no useful "page 2".
const GRAPH_NODE_LIMIT = 500;

// Per-memory neighbours, low on purpose: each node's top-N is already 2N edges once reciprocal
// pairs merge, and denser reads as a hairball.
const GRAPH_SEMANTIC_NEIGHBORS = 5;

// A group of n memories sharing a tag or collection is a clique of n(n-1)/2 edges, so broad groups
// ("article") would dominate; at <= 8 sharing implies relatedness, beyond that it's a category.
const MAX_SHARED_GROUP_SIZE = 8;

// Sharing this many tags or collections is a maximally strong link; rescales counts to 0..1 like
// semantic similarity so merged weights compare (see mergeEdges).
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
 * Each node's top-K similar siblings, with the vector store's `1 - (a <=> b)` conversion but self-referential.
 * Scanning inside the CTE, not the HNSW table, keeps "which memories are nodes" in one place; the worst case at GRAPH_NODE_LIMIT is 500x500 distances, fine for Postgres. Revisit if the cap rises a lot.
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
 * Memories sharing a tag or collection: one edge per pair, weighted by how many they share.
 * `b.memory_id > a.memory_id` emits each pair once.
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
 * One line per pair even when related several ways. Semantic wins the styling (the signal the user
 * didn't create); weight keeps the strongest contribution, which works as every kind is 0..1.
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
