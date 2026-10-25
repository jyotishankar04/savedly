import { and, count, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { collections, memories, plans, roles, users, userPlanAssignments, userRoles } from "../../../db/schema";
import { PlanAssignmentStatus } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import type { ListUsersQuery } from "./users.schema";

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: Date;
  roles: string[];
  planKey: string | null;
  planName: string | null;
}

async function attachRoles<T extends { id: string }>(items: T[]): Promise<(T & { roles: string[] })[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);

  const roleRows = await db
    .select({ userId: userRoles.userId, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(sql`${userRoles.userId} IN ${ids}`);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push(row.name);
    rolesByUser.set(row.userId, list);
  }

  return items.map((item) => ({ ...item, roles: rolesByUser.get(item.id) ?? [] }));
}

/**
 * Effective plan: active unexpired assignment, else the default. Same rule as resolveEffectivePlan,
 * duplicated because this runs batched over many users.
 */
async function activeAssignmentCondition() {
  const now = new Date();
  return and(eq(userPlanAssignments.status, PlanAssignmentStatus.ACTIVE), or(isNull(userPlanAssignments.endsAt), gte(userPlanAssignments.endsAt, now)));
}

async function attachPlans<T extends { id: string }>(items: T[]): Promise<(T & { planKey: string | null; planName: string | null })[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);

  const [defaultPlan] = await db.select({ key: plans.key, name: plans.name }).from(plans).where(eq(plans.isDefault, true)).limit(1);

  const assignmentRows = await db
    .select({ userId: userPlanAssignments.userId, key: plans.key, name: plans.name })
    .from(userPlanAssignments)
    .innerJoin(plans, eq(plans.id, userPlanAssignments.planId))
    .where(and(sql`${userPlanAssignments.userId} IN ${ids}`, await activeAssignmentCondition()))
    // Ascending, so the Map keeps each user's best plan (same rule as resolveEffectivePlan).
    .orderBy(plans.sortOrder, userPlanAssignments.startsAt);

  const planByUser = new Map(assignmentRows.map((r) => [r.userId, { key: r.key, name: r.name }]));

  return items.map((item) => {
    const plan = planByUser.get(item.id) ?? defaultPlan ?? null;
    return { ...item, planKey: plan?.key ?? null, planName: plan?.name ?? null };
  });
}

export async function listUsers(
  query: ListUsersQuery,
): Promise<{ items: AdminUserListItem[]; page: number; limit: number; total: number }> {
  const conditions = [];
  if (query.q) {
    conditions.push(or(ilike(users.email, `%${query.q}%`), ilike(users.name, `%${query.q}%`)));
  }
  if (query.status) {
    conditions.push(eq(users.status, query.status));
  }

  if (query.role) {
    const rows = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, query.role));
    const userIdsWithRole = rows.map((r) => r.userId);
    if (userIdsWithRole.length === 0) {
      return { items: [], page: query.page, limit: query.limit, total: 0 };
    }
    conditions.push(sql`${users.id} IN ${userIdsWithRole}`);
  }

  if (query.plan) {
    const [targetPlan] = await db.select({ id: plans.id, isDefault: plans.isDefault }).from(plans).where(eq(plans.key, query.plan)).limit(1);
    if (!targetPlan) {
      return { items: [], page: query.page, limit: query.limit, total: 0 };
    }

    const explicitRows = await db
      .select({ userId: userPlanAssignments.userId })
      .from(userPlanAssignments)
      .where(and(eq(userPlanAssignments.planId, targetPlan.id), await activeAssignmentCondition()));
    const explicitIds = explicitRows.map((r) => r.userId).filter((id): id is string => id != null);

    if (targetPlan.isDefault) {
      // Anyone with no active assignment at all is on the default plan, not only those without one
      // for this plan.
      const anyActiveRows = await db.select({ userId: userPlanAssignments.userId }).from(userPlanAssignments).where(await activeAssignmentCondition());
      const excludeIds = anyActiveRows.map((r) => r.userId).filter((id): id is string => id != null);
      conditions.push(
        excludeIds.length > 0
          ? or(sql`${users.id} IN ${explicitIds.length > 0 ? explicitIds : ["00000000-0000-0000-0000-000000000000"]}`, sql`${users.id} NOT IN ${excludeIds}`)
          : sql`true`, // nobody has any active assignment at all — everyone is on the default plan
      );
    } else {
      if (explicitIds.length === 0) {
        return { items: [], page: query.page, limit: query.limit, total: 0 };
      }
      conditions.push(sql`${users.id} IN ${explicitIds}`);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: total }] = await db.select({ value: count() }).from(users).where(where);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      status: users.status,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const withRoles = await attachRoles(rows);
  const items = await attachPlans(withRoles);
  return { items, page: query.page, limit: query.limit, total };
}

export async function getUserDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const [{ value: memoryCount }] = await db.select({ value: count() }).from(memories).where(eq(memories.userId, userId));
  const [{ value: collectionCount }] = await db
    .select({ value: count() })
    .from(collections)
    .where(eq(collections.userId, userId));

  return {
    ...user,
    roles: roleRows.map((r) => r.name),
    stats: { memoryCount, collectionCount },
  };
}
