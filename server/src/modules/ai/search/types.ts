/**
 * One leg's candidate: score is leg-specific (cosine similarity, ts_rank_cd) and only orders within
 * the leg before RRF.
 */
export interface SearchLegResult {
  memoryId: string;
  score: number;
}
