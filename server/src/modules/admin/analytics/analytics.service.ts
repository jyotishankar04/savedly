import { count, gte, sql } from "drizzle-orm";
import { db } from "../../../db";
import { collections, memories, sessions, users } from "../../../db/schema";
import type { AnalyticsRangeQuery } from "./analytics.schema";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getSignupsOverTime(query: AnalyticsRangeQuery) {
  const since = daysAgo(query.days);
  const rows = await db
    .select({ date: sql<string>`date(${users.createdAt})`, count: count() })
    .from(users)
    .where(gte(users.createdAt, since))
    .groupBy(sql`date(${users.createdAt})`)
    .orderBy(sql`date(${users.createdAt})`);
  return rows;
}

export async function getActiveUsers(query: AnalyticsRangeQuery) {
  const since = daysAgo(query.days);
  const rows = await db
    .select({ date: sql<string>`date(${sessions.lastActivityAt})`, count: sql<number>`count(distinct ${sessions.userId})::int` })
    .from(sessions)
    .where(gte(sessions.lastActivityAt, since))
    .groupBy(sql`date(${sessions.lastActivityAt})`)
    .orderBy(sql`date(${sessions.lastActivityAt})`);
  return rows;
}

export async function getContentGrowth(query: AnalyticsRangeQuery) {
  const since = daysAgo(query.days);
  const memoryRows = await db
    .select({ date: sql<string>`date(${memories.createdAt})`, count: count() })
    .from(memories)
    .where(gte(memories.createdAt, since))
    .groupBy(sql`date(${memories.createdAt})`)
    .orderBy(sql`date(${memories.createdAt})`);

  const collectionRows = await db
    .select({ date: sql<string>`date(${collections.createdAt})`, count: count() })
    .from(collections)
    .where(gte(collections.createdAt, since))
    .groupBy(sql`date(${collections.createdAt})`)
    .orderBy(sql`date(${collections.createdAt})`);

  return { memories: memoryRows, collections: collectionRows };
}
