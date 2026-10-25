import { and, eq, gte, like, sql, sum } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { attachments, collections, memories, aiUsageLogs, importBatches, shares } from "../../db/schema";
import { CollectionSource, PlanLimitType, ShareLinkAccess } from "../../db/enums";

export const platformOnly = sql`${aiUsageLogs.metadata}->>'source' = 'platform'`;

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type UsageCounter = (userId: string, dbClient: DbOrTx) => Promise<number>;

/**
 * How each limit type is counted: one function per type, since each lives on a different table with
 * its own rule (collections count source='user'; AI counts only user-initiated Ask queries, see the
 * "ask:" prefix in ai.routes.ts). A new PlanLimitType fails to compile until it has an entry.
 */
const USAGE_COUNTERS: Record<PlanLimitType, UsageCounter> = {
  [PlanLimitType.MEMORY_COUNT]: async (userId, dbClient) => {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(memories)
      .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)));
    return row?.value ?? 0;
  },
  [PlanLimitType.COLLECTION_COUNT]: async (userId, dbClient) => {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(collections)
      .where(and(eq(collections.userId, userId), eq(collections.source, CollectionSource.USER)));
    return row?.value ?? 0;
  },
  [PlanLimitType.STORAGE_MB]: async (userId, dbClient) => {
    const [row] = await dbClient
      .select({ value: sum(attachments.fileSize) })
      .from(attachments)
      .innerJoin(memories, eq(attachments.memoryId, memories.id))
      .where(eq(memories.userId, userId));
    const bytes = Number(row?.value ?? 0);
    return Math.ceil(bytes / (1024 * 1024));
  },
  // The three AI quotas count only *included* AI — calls that ran on the
  // platform's key, which the usage logger tags with metadata.source =
  // "platform". Calls on a user's own key never count.
  [PlanLimitType.AI_MONTHLY_QUERIES]: async (userId, dbClient) => {
    // Exact match on "ask:query", not a "rag:%" prefix — a single question
    // fans out into several rag:* rows internally, so counting those would
    // overcount. streamAsk logs exactly one "ask:query" row per question.
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.userId, userId),
          eq(aiUsageLogs.requestType, "ask:query"),
          platformOnly,
          gte(aiUsageLogs.createdAt, startOfCurrentMonth()),
        ),
      );
    return row?.value ?? 0;
  },
  [PlanLimitType.AI_MONTHLY_SAVES]: async (userId, dbClient) => {
    // One per memory the ingestion pipeline enriched on the platform key,
    // however many ingestion:* calls that took.
    const [row] = await dbClient
      .select({ value: sql<number>`count(distinct ${aiUsageLogs.memoryId})::int` })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.userId, userId),
          like(aiUsageLogs.requestType, "ingestion:%"),
          platformOnly,
          gte(aiUsageLogs.createdAt, startOfCurrentMonth()),
        ),
      );
    return row?.value ?? 0;
  },
  [PlanLimitType.WEB_SEARCH_MONTHLY]: async (userId, dbClient) => {
    // One "web:search" row per lookup (modules/ai/web-search), from saves and Ask alike.
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(aiUsageLogs)
      .where(and(eq(aiUsageLogs.userId, userId), eq(aiUsageLogs.requestType, "web:search"), gte(aiUsageLogs.createdAt, startOfCurrentMonth())));
    return row?.value ?? 0;
  },
  [PlanLimitType.IMPORT_MONTHLY_COUNT]: async (userId, dbClient) => {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(importBatches)
      .where(and(eq(importBatches.userId, userId), gte(importBatches.createdAt, startOfCurrentMonth())));
    return row?.value ?? 0;
  },
  // Retired: part of AI_MONTHLY_SAVES now.
  [PlanLimitType.AI_MONTHLY_VISION_QUERIES]: async () => 0,
  // A per-file cap, checked against each upload's size — there's no
  // running total to report.
  [PlanLimitType.MAX_FILE_MB]: async () => 0,
  [PlanLimitType.PUBLIC_SHARE_COUNT]: async (userId, dbClient) => {
    // Only links set to "public" count; invite-only or password shares are gated by a feature flag.
    // `shares` is imported directly because share.service imports this module.
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(shares)
      .where(and(eq(shares.ownerId, userId), eq(shares.linkAccess, ShareLinkAccess.PUBLIC)));
    return row?.value ?? 0;
  },
};

/** Current usage for one limit type. */
export function getCurrentUsage(userId: string, limitType: PlanLimitType, dbClient: DbOrTx = db): Promise<number> {
  return USAGE_COUNTERS[limitType](userId, dbClient);
}
