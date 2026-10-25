import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { aiUsageLogs, users } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import type { UsageByUserQuery, UsageRangeQuery } from "./ai-usage.schema";
import { daysAgo } from "../../shared/utils/days-ago";

const totalsSelect = {
  calls: count(),
  promptTokens: sql<number>`coalesce(sum(${aiUsageLogs.promptTokens}), 0)::int`,
  completionTokens: sql<number>`coalesce(sum(${aiUsageLogs.completionTokens}), 0)::int`,
  totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
  costEstimateUsd: sql<number>`coalesce(sum(${aiUsageLogs.costEstimateUsd}), 0)::float`,
};

export async function getUsageSummary(query: UsageRangeQuery) {
  const since = daysAgo(query.days);
  const where = gte(aiUsageLogs.createdAt, since);

  const [totals] = await db.select(totalsSelect).from(aiUsageLogs).where(where);

  const byProvider = await db
    .select({ provider: aiUsageLogs.provider, ...totalsSelect })
    .from(aiUsageLogs)
    .where(where)
    .groupBy(aiUsageLogs.provider)
    .orderBy(desc(sql`sum(${aiUsageLogs.totalTokens})`));

  const byModel = await db
    .select({ model: aiUsageLogs.model, ...totalsSelect })
    .from(aiUsageLogs)
    .where(where)
    .groupBy(aiUsageLogs.model)
    .orderBy(desc(sql`sum(${aiUsageLogs.totalTokens})`));

  const byRequestType = await db
    .select({ requestType: aiUsageLogs.requestType, ...totalsSelect })
    .from(aiUsageLogs)
    .where(where)
    .groupBy(aiUsageLogs.requestType)
    .orderBy(desc(sql`sum(${aiUsageLogs.totalTokens})`));

  const byDay = await db
    .select({ date: sql<string>`date(${aiUsageLogs.createdAt})`, ...totalsSelect })
    .from(aiUsageLogs)
    .where(where)
    .groupBy(sql`date(${aiUsageLogs.createdAt})`)
    .orderBy(sql`date(${aiUsageLogs.createdAt})`);

  return { totals, byProvider, byModel, byRequestType, byDay };
}

export async function getUsageByUser(
  query: UsageByUserQuery,
): Promise<{ items: unknown[]; page: number; limit: number; total: number }> {
  const since = daysAgo(query.days);
  const where = and(gte(aiUsageLogs.createdAt, since), isNotNull(aiUsageLogs.userId));

  const [{ value: total }] = await db
    .select({ value: sql<number>`count(distinct ${aiUsageLogs.userId})::int` })
    .from(aiUsageLogs)
    .where(where);

  const items = await db
    .select({
      userId: aiUsageLogs.userId,
      email: users.email,
      name: users.name,
      ...totalsSelect,
    })
    .from(aiUsageLogs)
    .leftJoin(users, eq(aiUsageLogs.userId, users.id))
    .where(where)
    .groupBy(aiUsageLogs.userId, users.email, users.name)
    .orderBy(desc(sql`sum(${aiUsageLogs.totalTokens})`))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return { items, page: query.page, limit: query.limit, total };
}

export async function getUsageForUser(userId: string, query: UsageRangeQuery) {
  const [user] = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const since = daysAgo(query.days);
  const where = and(eq(aiUsageLogs.userId, userId), gte(aiUsageLogs.createdAt, since));

  const [totals] = await db.select(totalsSelect).from(aiUsageLogs).where(where);

  const byRequestType = await db
    .select({ requestType: aiUsageLogs.requestType, ...totalsSelect })
    .from(aiUsageLogs)
    .where(where)
    .groupBy(aiUsageLogs.requestType)
    .orderBy(desc(sql`sum(${aiUsageLogs.totalTokens})`));

  const recent = await db.select().from(aiUsageLogs).where(where).orderBy(desc(aiUsageLogs.createdAt)).limit(50);

  return { user, totals, byRequestType, recent };
}
