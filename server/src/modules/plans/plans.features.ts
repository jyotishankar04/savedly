import { and, eq, gte, like, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { aiUsageLogs, plans } from "../../db/schema";
import { PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { env } from "../../config/env";
import { resolveEffectivePlan } from "./plans.catalog";
import { isWithinLimit } from "./plans.limits";
import { platformOnly, startOfCurrentMonth } from "./plans.usage";

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
