import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { plans, users, userPlanAssignments } from "../../../db/schema";
import { PlanAssignmentSource, PlanAssignmentStatus } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { resolveEffectivePlan } from "../../plans/api";
import { valueGrant } from "../plans/plan-grants.service";
import { adminChangeSubscription, billingStatus } from "../../billing/api";
import type { GrantPlanInput } from "./users.schema";
import { bumpUserCache } from "../../../shared/cache/response-cache";

// ---------------------------------------------------------------------------
// Plans — what an admin sees and changes on a user's page. The effective plan
// is the newest active assignment (plans.service.ts resolveEffectivePlan), so
// a fresh admin grant takes over from a subscription, and removing it hands
// back to whatever they pay for (or the default plan). Billing is never
// touched: a grant doesn't start, change or stop any charge.
// ---------------------------------------------------------------------------

export async function getUserPlan(userId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const { plan, assignment } = await resolveEffectivePlan(userId);
  const rows = await db
    .select({
      id: userPlanAssignments.id,
      planKey: plans.key,
      planName: plans.name,
      status: userPlanAssignments.status,
      source: userPlanAssignments.source,
      startsAt: userPlanAssignments.startsAt,
      endsAt: userPlanAssignments.endsAt,
      reason: userPlanAssignments.reason,
      assignedByEmail: sql<string | null>`(select email from users a where a.id = ${userPlanAssignments.assignedBy})`,
      priceMinor: plans.priceMinor,
      currency: plans.currency,
      billingInterval: plans.billingInterval,
    })
    .from(userPlanAssignments)
    .innerJoin(plans, eq(plans.id, userPlanAssignments.planId))
    .where(eq(userPlanAssignments.userId, userId))
    .orderBy(desc(userPlanAssignments.startsAt))
    .limit(20);
  const history = rows.map(({ priceMinor, billingInterval, ...row }) => {
    // What an admin grant has been worth — see plan-grants.service.ts.
    if (row.source !== PlanAssignmentSource.ADMIN_MANUAL) return { ...row, value: null };
    const value = valueGrant({ priceMinor, billingInterval, startsAt: row.startsAt, endsAt: row.endsAt, status: row.status });
    return { ...row, value: { monthlyMinor: value.monthlyMinor, givenSoFarMinor: value.givenSoFarMinor, stillToComeMinor: value.stillToComeMinor } };
  });

  const now = new Date();
  const live = (row: (typeof history)[number]) =>
    row.status === PlanAssignmentStatus.ACTIVE && (!row.endsAt || row.endsAt > now);

  // The live Dodo subscription, when there's a provider: whether the admin
  // form changes it (active) or can only grant over it (cancelled / none).
  const billing = await billingStatus(userId)
    .then((b) => b.subscription)
    .catch(() => null);

  return {
    billing,
    current: {
      planKey: plan.key,
      planName: plan.name,
      source: assignment?.source ?? null,
      endsAt: assignment?.endsAt ?? null,
      reason: assignment?.reason ?? null,
    },
    /** The paid subscription underneath, if any — what they fall back to when a grant ends. */
    subscription: history.find((row) => row.source === PlanAssignmentSource.SUBSCRIPTION && live(row)) ?? null,
    hasActiveGrant: history.some((row) => row.source === PlanAssignmentSource.ADMIN_MANUAL && live(row)),
    history,
  };
}

export async function grantPlan(userId: string, input: GrantPlanInput, adminUserId: string, ipAddress?: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  // Someone paying through Dodo: change the real subscription instead of
  // laying a grant over it, so billing and the app never disagree.
  const changed = await adminChangeSubscription(userId, input.planKey);
  if (changed) {
    await logAdminAction({
      adminUserId,
      action: changed.action === "cancelling" ? "user.subscription.cancel_at_period_end" : "user.subscription.plan_changed",
      targetType: "user",
      targetId: userId,
      beforeValue: null,
      afterValue: { plan: changed.planName, reason: input.reason ?? null },
      ipAddress,
    });
    await bumpUserCache(userId);
  return getUserPlan(userId);
  }
  const [plan] = await db.select().from(plans).where(eq(plans.key, input.planKey)).limit(1);
  if (!plan) throw new AppError("Plan not found", 404, "NOT_FOUND");

  // The best running plan wins (resolveEffectivePlan), so a grant at or
  // below what they've paid for would do nothing. Say so instead.
  const paid = (await billingStatus(userId).catch(() => ({ subscription: null }))).subscription;
  if (paid && plan.sortOrder <= paid.sortOrder) {
    const until = paid.periodEnd
      ? ` through ${new Date(paid.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "";
    throw new AppError(
      `They've paid for ${paid.planName}${until}, so a grant can't give them less.${paid.status === "cancelled" ? " Their subscription is already cancelled and won't renew." : ""}`,
      409,
      "BELOW_PAID_PLAN",
    );
  }

  const before = await resolveEffectivePlan(userId);
  const now = new Date();
  await db.transaction(async (tx) => {
    // One admin grant at a time: a new one replaces the last.
    await tx
      .update(userPlanAssignments)
      .set({ status: PlanAssignmentStatus.SUPERSEDED, endsAt: now })
      .where(
        and(
          eq(userPlanAssignments.userId, userId),
          eq(userPlanAssignments.source, PlanAssignmentSource.ADMIN_MANUAL),
          eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
        ),
      );
    await tx.insert(userPlanAssignments).values({
      userId,
      planId: plan.id,
      status: PlanAssignmentStatus.ACTIVE,
      source: PlanAssignmentSource.ADMIN_MANUAL,
      startsAt: now,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      assignedBy: adminUserId,
      reason: input.reason || null,
    });
  });

  await logAdminAction({
    adminUserId,
    action: "user.plan.granted",
    targetType: "user",
    targetId: userId,
    beforeValue: { plan: before.plan.key },
    afterValue: { plan: plan.key, endsAt: input.endsAt ?? null, reason: input.reason ?? null },
    ipAddress,
  });
  await bumpUserCache(userId);
  return getUserPlan(userId);
}

/** Ends the admin grant, so the user is back on what they pay for (or the default plan). */
export async function removePlanGrant(userId: string, adminUserId: string, ipAddress?: string) {
  const ended = await db
    .update(userPlanAssignments)
    .set({ status: PlanAssignmentStatus.CANCELLED, endsAt: new Date() })
    .where(
      and(
        eq(userPlanAssignments.userId, userId),
        eq(userPlanAssignments.source, PlanAssignmentSource.ADMIN_MANUAL),
        eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE),
      ),
    )
    .returning({ id: userPlanAssignments.id });
  if (!ended.length) throw new AppError("This user has no plan given by an admin", 404, "NOT_FOUND");

  await logAdminAction({
    adminUserId,
    action: "user.plan.grant_removed",
    targetType: "user",
    targetId: userId,
    beforeValue: null,
    afterValue: null,
    ipAddress,
  });
  await bumpUserCache(userId);
  return getUserPlan(userId);
}
