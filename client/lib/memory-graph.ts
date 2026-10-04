import { apiFetch } from "@/lib/auth";
import type { MemoryType } from "@/types/memory";

export type GraphEdgeKind = "semantic" | "tag" | "collection";

export interface GraphNode {
  id: string;
  title: string;
  type: MemoryType;
  resourceCategory: string | null;
  previewImageUrl: string | null;
  tags: string[];
  collections: { id: string; name: string }[];
  createdAt: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: GraphEdgeKind;
  /** 0..1 and comparable across kinds — the server normalises before merging. */
  weight: number;
}

export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** True when the vault is larger than the graph's node cap. */
  truncated: boolean;
}

export async function getMemoryGraph(): Promise<MemoryGraph> {
  return apiFetch<MemoryGraph>("/memories/graph");
}

export const EDGE_KIND_LABEL: Record<GraphEdgeKind, string> = {
  semantic: "Similar meaning",
  tag: "Shared tag",
  collection: "Same collection",
};
