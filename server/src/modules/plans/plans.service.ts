import { and, desc, eq, gte, isNull, like, or, sql, sum } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { attachments, collections, memories, aiUsageLogs, importBatches, plans, planLimits, shares, userPlanAssignments } from "../../db/schema";
import { CollectionSource, PlanAssignmentStatus, PlanLimitType, ShareLinkAccess } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { env } from "../../config/env";

export type PlanLimits = Partial<Record<PlanLimitType, number | null>>;

export async function listPublicPlans(dbClient: DbOrTx = db) {
  const rows = await dbClient
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(plans.sortOrder);

  return Promise.all(
    rows.map(async (plan) => ({ ...plan, limits: await getPlanLimits(plan.id, dbClient) })),
  );
}

export async function getPlanLimits(planId: string, dbClient: DbOrTx = db): Promise<PlanLimits> {
  const rows = await dbClient.select().from(planLimits).where(eq(planLimits.planId, planId));
  const limits: PlanLimits = {};
  for (const row of rows) {
    limits[row.limitType] = row.limitValue;
  }
  return limits;
}

/**
 * The plan currently in effect for a user: their active, not-yet-expired
 * assignment if one exists, else the plan marked isDefault. Throws if
 * neither exists — a misconfigured deployment (no default plan seeded)
 * should fail loudly here rather than silently letting every limit check
 * pass as unlimited.
 */
/**
 * The plan a user gets right now. With several running at once (a paid
 * subscription and an admin grant), the best one wins — ranked by the
 * plans' sortOrder, newest first on a tie — so a grant can add to what
 * someone pays for but never take it away: what the payment provider says
 * they paid for is always the floor.
 */
export async function resolveEffectivePlan(userId: string, dbClient: DbOrTx = db) {
  const [row] = await dbClient
    .select({ assignment: userPlanAssignments, plan: plans })
    .from(userPlanAssignments)
    .innerJoin(plans, eq(plans.id, userPlanAssignments.planId))
    .where(
      and(
        eq(userPlanAssignments.userId, userId),
        eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
        or(isNull(userPlanAssignments.endsAt), gte(userPlanAssignments.endsAt, new Date())),
      ),
    )
    .orderBy(desc(plans.sortOrder), desc(userPlanAssignments.startsAt))
    .limit(1);

  if (row) return { plan: row.plan, assignment: row.assignment };

  const [defaultPlan] = await dbClient.select().from(plans).where(eq(plans.isDefault, true)).limit(1);
  if (!defaultPlan) {
    throw new AppError("No default plan configured", 500, "NO_DEFAULT_PLAN");
  }
  return { plan: defaultPlan, assignment: null };
}

const platformOnly = sql`${aiUsageLogs.metadata}->>'source' = 'platform'`;

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Current usage for one limit type. Deliberately one query per type rather
 * than a single mega-query — each limit lives on a different table with a
 * different "what counts" rule (e.g. collections only count source='user',
 * AI usage only counts user-initiated Ask queries, not ingestion/embedding
 * background calls — see ai.routes.ts's "ask:" requestType prefix).
 */
export async function getCurrentUsage(userId: string, limitType: PlanLimitType, dbClient: DbOrTx = db): Promise<number> {
  switch (limitType) {
    case PlanLimitType.MEMORY_COUNT: {
      const [row] = await dbClient
        .select({ value: sql<number>`count(*)::int` })
        .from(memories)
        .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)));
      return row?.value ?? 0;
    }
    case PlanLimitType.COLLECTION_COUNT: {
      const [row] = await dbClient
        .select({ value: sql<number>`count(*)::int` })
        .from(collections)
        .where(and(eq(collections.userId, userId), eq(collections.source, CollectionSource.USER)));
      return row?.value ?? 0;
    }
    case PlanLimitType.STORAGE_MB: {
      const [row] = await dbClient
        .select({ value: sum(attachments.fileSize) })
        .from(attachments)
        .innerJoin(memories, eq(attachments.memoryId, memories.id))
        .where(eq(memories.userId, userId));
      const bytes = Number(row?.value ?? 0);
      return Math.ceil(bytes / (1024 * 1024));
    }
    // The three AI quotas count only *included* AI — calls that ran on the
    // platform's key, which the usage logger tags with metadata.source =
    // "platform". Calls on a user's own key never count.
    case PlanLimitType.AI_MONTHLY_QUERIES: {
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
    }
    case PlanLimitType.AI_MONTHLY_SAVES: {
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
    }
    case PlanLimitType.IMPORT_MONTHLY_COUNT: {
      const [row] = await dbClient
        .select({ value: sql<number>`count(*)::int` })
        .from(importBatches)
        .where(and(eq(importBatches.userId, userId), gte(importBatches.createdAt, startOfCurrentMonth())));
      return row?.value ?? 0;
    }
    case PlanLimitType.AI_MONTHLY_VISION_QUERIES: // retired: part of AI_MONTHLY_SAVES now
    case PlanLimitType.MAX_FILE_MB:
      // A per-file cap, checked against each upload's size — there's no
      // running total to report.
      return 0;
    case PlanLimitType.PUBLIC_SHARE_COUNT: {
      // Only links actually set to "public" count against the cap — an
      // invite-only or password-protected share is gated by a features flag
      // instead, not by this quota. The `shares` table is imported directly
      // rather than calling share.service: that module imports this one.
      const [row] = await dbClient
        .select({ value: sql<number>`count(*)::int` })
        .from(shares)
        .where(and(eq(shares.ownerId, userId), eq(shares.linkAccess, ShareLinkAccess.PUBLIC)));
      return row?.value ?? 0;
    }
  }
}

interface LimitCheck {
  ok: boolean;
  planName: string;
  limitValue: number | null;
  current: number;
}

async function checkLimit(userId: string, limitType: PlanLimitType, delta: number, dbClient: DbOrTx = db): Promise<LimitCheck> {
  // Nothing is limited on a self-hosted install.
  if (env.SELF_HOSTED) return { ok: true, planName: "Self-hosted", limitValue: null, current: 0 };

  const { plan } = await resolveEffectivePlan(userId, dbClient);
  const limitValue = (await getPlanLimits(plan.id, dbClient))[limitType] ?? null;
  if (limitValue === null) return { ok: true, planName: plan.name, limitValue: null, current: 0 }; // unlimited

  const current = await getCurrentUsage(userId, limitType, dbClient);
  return { ok: current + delta <= limitValue, planName: plan.name, limitValue, current };
}

const LIMIT_MESSAGES: Partial<Record<PlanLimitType, (limit: number, plan: string) => string>> = {
  [PlanLimitType.MEMORY_COUNT]: (n, p) => `You've reached the ${p} plan's ${n.toLocaleString("en-US")} saved memories. Upgrade to keep saving.`,
  [PlanLimitType.STORAGE_MB]: (n, p) => `This file would go over the ${p} plan's ${formatMb(n)} of storage.`,
  [PlanLimitType.PUBLIC_SHARE_COUNT]: (n, p) =>
    `The ${p} plan includes ${n} public ${n === 1 ? "link" : "links"}. Make one private or upgrade for more.`,
  [PlanLimitType.COLLECTION_COUNT]: (n, p) => `The ${p} plan includes ${n} collections of your own. Upgrade for unlimited.`,
  [PlanLimitType.IMPORT_MONTHLY_COUNT]: (n, p) =>
    `The ${p} plan includes ${n} ${n === 1 ? "import" : "imports"} a month. Upgrade for unlimited imports, or try again next month.`,
};

function formatMb(mb: number): string {
  return mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${mb} MB`;
}

/**
 * Throws 403 PLAN_LIMIT_EXCEEDED if adding `delta` to the user's current
 * usage of `limitType` would go over their plan. Null limit = unlimited, and
 * nothing is ever limited on a self-hosted install.
 */
export async function assertWithinLimit(userId: string, limitType: PlanLimitType, delta = 1, dbClient: DbOrTx = db): Promise<void> {
  const result = await checkLimit(userId, limitType, delta, dbClient);
  if (result.ok) return;
  const message =
    LIMIT_MESSAGES[limitType]?.(result.limitValue!, result.planName) ??
    `This would go over your ${result.planName} plan's limit (${result.limitValue}).`;
  throw new AppError(message, 403, "PLAN_LIMIT_EXCEEDED", {
    limitType,
    limitValue: result.limitValue,
    current: result.current,
    delta,
  });
}

/** How many more of `limitType` the user's plan allows. Null = unlimited. For callers that add as many as fit. */
export async function remainingWithinLimit(userId: string, limitType: PlanLimitType, dbClient: DbOrTx = db): Promise<number | null> {
  const result = await checkLimit(userId, limitType, 0, dbClient);
  return result.limitValue === null ? null : Math.max(0, result.limitValue - result.current);
}

/** Non-throwing counterpart, for callers that degrade instead of failing (e.g. included-AI quotas). */
export async function isWithinLimit(userId: string, limitType: PlanLimitType, delta = 1, dbClient: DbOrTx = db): Promise<boolean> {
  return (await checkLimit(userId, limitType, delta, dbClient)).ok;
}

/** Throws if a single file is bigger than the plan allows. */
export async function assertFileSizeAllowed(userId: string, fileSizeBytes: number): Promise<void> {
  if (env.SELF_HOSTED) return;
  const { plan } = await resolveEffectivePlan(userId);
  const maxMb = (await getPlanLimits(plan.id))[PlanLimitType.MAX_FILE_MB] ?? null;
  if (maxMb !== null && fileSizeBytes > maxMb * 1024 * 1024) {
    throw new AppError(`Files on the ${plan.name} plan can be up to ${formatMb(maxMb)}.`, 403, "PLAN_LIMIT_EXCEEDED", {
      limitType: PlanLimitType.MAX_FILE_MB,
      limitValue: maxMb,
    });
  }
}

// ---------------------------------------------------------------------------
// Plan features — what a plan unlocks beyond volume. Stored in plans.features;
// every one is on for a self-hosted install. Gating only ever blocks adding
// something new: whatever someone already has (vault items, shares, calendar
// links) stays readable and removable after a downgrade.
// ---------------------------------------------------------------------------

export const PLAN_FEATURES = {
  // Read mid-sentence: "Your plan doesn't include <label>."
  vault: "the private vault",
  passwordProtectedShares: "password-protected links",
  directShares: "inviting people to a share",
  privateShareRequests: "links people request access to",
  shareAnalyticsDaily: "daily view charts for shares",
  shareAnalyticsViewers: "seeing who viewed a share",
  insightsFullHistory: "a full year of insights",
  calendarSync: "calendar sync",
  aiEventDetection: "finding events in what you save",
  batchOperations: "bulk actions",
} as const;
export type PlanFeature = keyof typeof PLAN_FEATURES;

export async function planHasFeature(userId: string, feature: PlanFeature, dbClient: DbOrTx = db): Promise<boolean> {
  if (env.SELF_HOSTED) return true;
  const { plan } = await resolveEffectivePlan(userId, dbClient);
  return plan.features?.[feature] === true;
}

/** Throws 403 PLAN_FEATURE_REQUIRED, naming the cheapest active plan that has the feature. */
export async function assertFeature(userId: string, feature: PlanFeature): Promise<void> {
  if (await planHasFeature(userId, feature)) return;
  const [cheapest] = await db
    .select({ name: plans.name })
    .from(plans)
    .where(and(eq(plans.isActive, true), sql`${plans.features} ->> ${feature} = 'true'`))
    .orderBy(plans.sortOrder)
    .limit(1);
  const upgrade = cheapest ? ` Upgrade to ${cheapest.name} to use it.` : "";
  throw new AppError(`Your plan doesn't include ${PLAN_FEATURES[feature]}.${upgrade}`, 403, "PLAN_FEATURE_REQUIRED", {
    feature,
    plan: cheapest?.name ?? null,
  });
}

/**
 * Plans with the `managedAi` feature (AI included) supply all of a user's AI
 * on the platform's key: their own keys are kept but not used, and they can't
 * add new ones. Never true on a self-hosted install.
 */
export async function planHasManagedAi(userId: string, dbClient: DbOrTx = db): Promise<boolean> {
  if (env.SELF_HOSTED) return false;
  const { plan } = await resolveEffectivePlan(userId, dbClient);
  return plan.features?.managedAi === true;
}

// ---------------------------------------------------------------------------
// Included AI — may this call run on the platform's key?
// ---------------------------------------------------------------------------

export type IncludedAiPurpose =
  | { kind: "save"; memoryId: string | null }
  | { kind: "ask"; threadId: string | null };

// How long after a question is admitted its follow-up model calls (the
// agent, grounding check, retries) still ride on that admission.
const ASK_ADMISSION_WINDOW_MS = 15 * 60 * 1000;

/**
 * Whether a model call for this purpose may use included AI, given the
 * user's plan quota. Only asked when the user has no key of their own for
 * the role — their own key is never limited.
 *
 * - save: one memory = one unit of AI processing, however many ingestion
 *   calls it takes — reading an image included. A memory that already ran
 *   on included AI this month keeps going; a new one needs room under
 *   AI_MONTHLY_SAVES.
 * - ask: admitted once per question by streamAsk (which logs the
 *   "ask:query" row tagged platform); calls in that thread ride on it.
 */
export async function canUseIncludedAi(userId: string, purpose: IncludedAiPurpose): Promise<boolean> {
  switch (purpose.kind) {
    case "save": {
      if (purpose.memoryId) {
        const [already] = await db
          .select({ id: aiUsageLogs.id })
          .from(aiUsageLogs)
          .where(
            and(
              eq(aiUsageLogs.memoryId, purpose.memoryId),
              like(aiUsageLogs.requestType, "ingestion:%"),
              platformOnly,
              gte(aiUsageLogs.createdAt, startOfCurrentMonth()),
            ),
          )
          .limit(1);
        if (already) return true;
      }
      return isWithinLimit(userId, PlanLimitType.AI_MONTHLY_SAVES, 1);
    }
    case "ask": {
      if (!purpose.threadId) return false;
      const [admitted] = await db
        .select({ id: aiUsageLogs.id })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.userId, userId),
            eq(aiUsageLogs.threadId, purpose.threadId),
            eq(aiUsageLogs.requestType, "ask:query"),
            platformOnly,
            gte(aiUsageLogs.createdAt, new Date(Date.now() - ASK_ADMISSION_WINDOW_MS)),
          ),
        )
        .limit(1);
      return !!admitted;
    }
  }
}

export async function getMyPlanSummary(userId: string) {
  const { plan, assignment } = await resolveEffectivePlan(userId);
  const limits = await getPlanLimits(plan.id);

  const usage: Partial<Record<PlanLimitType, number>> = {};
  for (const limitType of Object.keys(limits) as PlanLimitType[]) {
    if (limitType === PlanLimitType.MAX_FILE_MB) continue;
    usage[limitType] = await getCurrentUsage(userId, limitType);
  }

  return { plan, assignment, limits, usage, selfHosted: env.SELF_HOSTED };
}
