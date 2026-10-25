import type { SearchLegResult } from "./types";

// Standard RRF constant, matches docs/AI_REQUIREMENTS.md's hybrid search spec.
export const RRF_K = 60;

// Cosine floor for the semantic leg, applied before RRF so a small corpus's noise never earns a
// rank. text-embedding-3-small scores ~0.25-0.45 for related pairs and ~0.05-0.15 for unrelated;
// 0.2 is conservative, tune with real traffic.
export const SEMANTIC_SIMILARITY_FLOOR = 0.2;

export interface RankedResult {
  memoryId: string;
  rrfScore: number;
}

/**
 * Inputs must be sorted best-first and already filtered (floor applied to `semantic`); rank is the
 * 1-based position in each. A memory on both legs outranks one on a single leg, with no hand-tuned
 * weights.
 */
export function rrfMerge(semantic: SearchLegResult[], lexical: SearchLegResult[]): RankedResult[] {
  const scores = new Map<string, number>();

  const addLeg = (leg: SearchLegResult[]) => {
    leg.forEach((item, index) => {
      const rank = index + 1;
      scores.set(item.memoryId, (scores.get(item.memoryId) ?? 0) + 1 / (RRF_K + rank));
    });
  };

  addLeg(semantic);
  addLeg(lexical);

  return [...scores.entries()]
    .map(([memoryId, rrfScore]) => ({ memoryId, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}
