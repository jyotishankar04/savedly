import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { db, type DbOrTx } from "../../db";
import { plans, planLimits, userPlanAssignments } from "../../db/schema";
import { PlanAssignmentStatus, PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { env } from "../../config/env";
import { getCurrentUsage } from "./plans.usage";

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
