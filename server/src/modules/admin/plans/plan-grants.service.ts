import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { plans, userPlanAssignments, users } from "../../../db/schema";
import { PlanAssignmentSource, PlanAssignmentStatus, PlanBillingInterval } from "../../../db/enums";

// What paid access admins have given away, in money. A grant is valued at
// the price of the plan it gives, spread evenly over days: a $10/month plan
// is worth about 33 cents a day. Free (price 0) grants are worth nothing.

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365;

const PERIODS_PER_YEAR: Record<PlanBillingInterval, number> = {
  [PlanBillingInterval.MONTHLY]: 12,
  [PlanBillingInterval.SEMI_ANNUAL]: 2,
  [PlanBillingInterval.YEARLY]: 1,
  [PlanBillingInterval.ONE_TIME]: 0,
};

export interface GrantValueInput {
  priceMinor: number;
  billingInterval: PlanBillingInterval;
  startsAt: Date;
  endsAt: Date | null;
  status: PlanAssignmentStatus;
}

export interface GrantValue {
  /** What the plan costs per month. */
  monthlyMinor: number;
  /** From the start of the grant until today (or until it ended). */
  givenSoFarMinor: number;
  /** From today to the end date, for a grant still running that has one. */
  stillToComeMinor: number;
  active: boolean;
  openEnded: boolean;
}

export function valueGrant(grant: GrantValueInput, now = new Date()): GrantValue {
  const perDay = (grant.priceMinor * PERIODS_PER_YEAR[grant.billingInterval]) / DAYS_PER_YEAR;
  const active = grant.status === PlanAssignmentStatus.ACTIVE && (!grant.endsAt || grant.endsAt > now);
  const until = grant.endsAt && grant.endsAt < now ? grant.endsAt : now;
  const daysSoFar = Math.max(0, (until.getTime() - grant.startsAt.getTime()) / DAY_MS);
  const daysLeft = active && grant.endsAt ? Math.max(0, (grant.endsAt.getTime() - now.getTime()) / DAY_MS) : 0;
  return {
    monthlyMinor: Math.round((perDay * DAYS_PER_YEAR) / 12),
    givenSoFarMinor: Math.round(perDay * daysSoFar),
    stillToComeMinor: Math.round(perDay * daysLeft),
    active,
    openEnded: active && !grant.endsAt,
  };
}

/** Totals for Admin -> Overview, per currency (plans are usually all one). */
export async function getPlanGrantsSummary() {
  const rows = await db
    .select({
      id: userPlanAssignments.id,
      userId: userPlanAssignments.userId,
      userEmail: users.email,
      planName: plans.name,
      priceMinor: plans.priceMinor,
      currency: plans.currency,
      billingInterval: plans.billingInterval,
      status: userPlanAssignments.status,
      startsAt: userPlanAssignments.startsAt,
      endsAt: userPlanAssignments.endsAt,
      updatedAt: userPlanAssignments.updatedAt,
      reason: userPlanAssignments.reason,
      assignedByEmail: sql<string | null>`(select email from users a where a.id = ${userPlanAssignments.assignedBy})`,
    })
    .from(userPlanAssignments)
    .innerJoin(plans, eq(plans.id, userPlanAssignments.planId))
    .leftJoin(users, eq(users.id, userPlanAssignments.userId))
    .where(and(eq(userPlanAssignments.source, PlanAssignmentSource.ADMIN_MANUAL)))
    .orderBy(desc(userPlanAssignments.startsAt));

  const now = new Date();
  // A grant whose user was deleted before deletions ended assignments has no
  // owner: count it as over, as of when its row last changed.
  const valued = rows.map((row) => {
    const orphan = row.userId === null;
    const input = orphan
      ? { ...row, status: PlanAssignmentStatus.CANCELLED, endsAt: row.endsAt && row.endsAt < row.updatedAt ? row.endsAt : row.updatedAt }
      : row;
    return { ...row, ...valueGrant(input, now) };
  });

  const totals = new Map<string, { currency: string; givenSoFarMinor: number; monthlyNowMinor: number; stillToComeMinor: number }>();
  const byAdmin = new Map<string, { email: string; grants: number; givenSoFarMinor: number; currency: string }>();
  for (const grant of valued) {
    const total = totals.get(grant.currency) ?? { currency: grant.currency, givenSoFarMinor: 0, monthlyNowMinor: 0, stillToComeMinor: 0 };
    total.givenSoFarMinor += grant.givenSoFarMinor;
    total.stillToComeMinor += grant.stillToComeMinor;
    if (grant.active) total.monthlyNowMinor += grant.monthlyMinor;
    totals.set(grant.currency, total);

    const email = grant.assignedByEmail ?? "A removed admin";
    const admin = byAdmin.get(`${email}|${grant.currency}`) ?? { email, grants: 0, givenSoFarMinor: 0, currency: grant.currency };
    admin.grants += 1;
    admin.givenSoFarMinor += grant.givenSoFarMinor;
    byAdmin.set(`${email}|${grant.currency}`, admin);
  }

  return {
    grants: valued.length,
    activeGrants: valued.filter((g) => g.active && g.priceMinor > 0).length,
    openEndedGrants: valued.filter((g) => g.openEnded && g.priceMinor > 0).length,
    totals: [...totals.values()].sort((a, b) => b.givenSoFarMinor - a.givenSoFarMinor),
    byAdmin: [...byAdmin.values()].sort((a, b) => b.givenSoFarMinor - a.givenSoFarMinor),
    active: valued
      .filter((g) => g.active && g.priceMinor > 0)
      .slice(0, 50)
      .map((g) => ({
        id: g.id,
        userId: g.userId,
        userEmail: g.userEmail,
        planName: g.planName,
        startsAt: g.startsAt,
        endsAt: g.endsAt,
        reason: g.reason,
        assignedByEmail: g.assignedByEmail,
        currency: g.currency,
        monthlyMinor: g.monthlyMinor,
        givenSoFarMinor: g.givenSoFarMinor,
      })),
  };
}
