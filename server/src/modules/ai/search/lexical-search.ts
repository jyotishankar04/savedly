import { and, sql, type SQL } from "drizzle-orm";
import { db } from "../../../db";
import { memories } from "../../../db/schema";
import type { SearchLegResult } from "./types";

/**
 * Always Postgres (tsvector/GIN has no Upstash equivalent). `filterConditions` must already carry
 * the list path's scoping; this adds the full-text predicate.
 */
export async function lexicalSearch(
  queryText: string,
  filterConditions: SQL[],
  limit: number,
): Promise<SearchLegResult[]> {
  const tsQuery = sql`plainto_tsquery('english', ${queryText})`;
  const rows = await db
    .select({
      id: memories.id,
      score: sql<number>`ts_rank_cd(${memories.ftsTokens}, ${tsQuery})`.as("score"),
    })
    .from(memories)
    .where(and(...filterConditions, sql`${memories.ftsTokens} @@ ${tsQuery}`))
    .orderBy(sql`ts_rank_cd(${memories.ftsTokens}, ${tsQuery}) DESC`)
    .limit(limit);

  return rows.map((row) => ({ memoryId: row.id, score: row.score }));
}
