import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { collections, memories, tags } from "../../db/schema";
import { listTags } from "../tag/tag.service";
import { listCollections } from "../collection/collection.service";
import { planHasFeature } from "../plans/plans.service";

export interface CountedLabel {
  label: string;
  count: number;
}

export interface DateCount {
  date: string;
  count: number;
}

export interface Insights {
  totals: {
    memories: number;
    collections: number;
    tags: number;
    favorites: number;
    thisWeek: number;
  };
  byType: CountedLabel[];
  byCategory: CountedLabel[];
  byCaptureMethod: CountedLabel[];
  topTags: CountedLabel[];
  topCollections: CountedLabel[];
  topDomains: CountedLabel[];
  activity: DateCount[];
  /** How many days `activity` covers on this plan. */
  historyDays: number;
}

const TOP_TAGS = 10;
const TOP_COLLECTIONS = 6;
const TOP_DOMAINS = 8;
const ACTIVITY_DAYS = 365;
// Without the insightsFullHistory plan feature, the activity chart covers
// the last 30 days.
const SHORT_ACTIVITY_DAYS = 30;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Every stat is scoped to the user's live memories — trashed ones are
 * excluded everywhere, same as every other read path in this codebase.
 */
// Vaulted memories are excluded unconditionally — insights never reflects
// vault contents, whether or not the vault happens to be unlocked.
const liveMemories = (userId: string) =>
  and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(memories.isVaulted, false));

export async function getInsights(userId: string): Promise<Insights> {
  const historyDays = (await planHasFeature(userId, "insightsFullHistory")) ? ACTIVITY_DAYS : SHORT_ACTIVITY_DAYS;
  const [
    totals,
    byType,
    byCategory,
    byCaptureMethod,
    topDomains,
    activity,
    userTags,
    userCollections,
  ] = await Promise.all([
    getTotals(userId),
    getByType(userId),
    getByCategory(userId),
    getByCaptureMethod(userId),
    getTopDomains(userId),
    getActivity(userId, historyDays),
    listTags(userId),
    listCollections(userId, { includeSystem: true, isVaulted: false }),
  ]);

  return {
    totals: { ...totals, tags: userTags.length, collections: userCollections.length },
    byType,
    byCategory,
    byCaptureMethod,
    topTags: userTags.slice(0, TOP_TAGS).map((tag) => ({ label: tag.name, count: tag.memoryCount })),
    topCollections: [...userCollections]
      .sort((a, b) => b.memoryCount - a.memoryCount)
      .slice(0, TOP_COLLECTIONS)
      .map((collection) => ({ label: collection.name, count: collection.memoryCount })),
    topDomains,
    activity,
    historyDays,
  };
}

async function getTotals(userId: string) {
  const [row] = await db
    .select({
      memories: count(),
      favorites: sql<number>`coalesce(sum(case when ${memories.isFavorite} then 1 else 0 end), 0)::int`,
      thisWeek: sql<number>`coalesce(sum(case when ${memories.createdAt} >= ${daysAgo(7)} then 1 else 0 end), 0)::int`,
    })
    .from(memories)
    .where(liveMemories(userId));

  return { memories: row?.memories ?? 0, favorites: row?.favorites ?? 0, thisWeek: row?.thisWeek ?? 0 };
}

async function getByType(userId: string): Promise<CountedLabel[]> {
  const rows = await db
    .select({ label: memories.type, count: count() })
    .from(memories)
    .where(liveMemories(userId))
    .groupBy(memories.type)
    .orderBy(desc(count()));

  return rows;
}

/**
 * The AI's own "other" bucket and an un-analysed null mean the same thing to
 * a reader, and folding them here avoids the page ending up with two
 * different "Other" slices once it lumps the long tail.
 */
async function getByCategory(userId: string): Promise<CountedLabel[]> {
  const label = sql<string>`coalesce(nullif(${memories.resourceCategory}, 'other'), 'uncategorized')`;

  return db
    .select({ label, count: count() })
    .from(memories)
    .where(liveMemories(userId))
    .groupBy(label)
    .orderBy(desc(count()));
}

async function getByCaptureMethod(userId: string): Promise<CountedLabel[]> {
  const label = sql<string>`coalesce(${memories.captureMethod}, 'unknown')`;

  return db
    .select({ label, count: count() })
    .from(memories)
    .where(liveMemories(userId))
    .groupBy(label)
    .orderBy(desc(count()));
}

/** Host only — scheme, "www." and path stripped, so one site is one bar. */
async function getTopDomains(userId: string): Promise<CountedLabel[]> {
  const label = sql<string>`regexp_replace(${memories.url}, '^https?://(www\\.)?([^/]+).*$', '\\2')`;

  return db
    .select({ label, count: count() })
    .from(memories)
    .where(and(liveMemories(userId), sql`${memories.url} is not null`))
    .groupBy(label)
    .orderBy(desc(count()))
    .limit(TOP_DOMAINS);
}

/** Only days with saves — the client fills the blanks to build its calendar grid. */
async function getActivity(userId: string, days: number): Promise<DateCount[]> {
  const day = sql<string>`date(${memories.createdAt})`;

  return db
    .select({ date: day, count: count() })
    .from(memories)
    .where(and(liveMemories(userId), gte(memories.createdAt, daysAgo(days))))
    .groupBy(day)
    .orderBy(day);
}
