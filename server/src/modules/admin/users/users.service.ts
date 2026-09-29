import { and, count, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { collections, memories, plans, roles, users, userPlanAssignments, userRoles } from "../../../db/schema";
import { EmailCategory, EmailTemplateKey, PlanAssignmentStatus, UserStatus } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { logger } from "../../../shared/utils/logger";
import { env } from "../../../config/env";
import { hardDeleteAccount, revokeAllSessionsForUser } from "../../account/account.service";
import { hashPassword } from "../../../shared/crypto/scrypt-password";
import { isPasswordAuthEnabled } from "../../feature-flags/feature-flags.service";
import { assignAdminRole, assignDefaultRole } from "../../auth/auth.service";
import { sendEmail } from "../../email";
import { userStatusChangedEmailTemplate } from "../../../shared/mailer/templates";
import type { CreateUserInput, ListUsersQuery, SetUserPasswordInput, UpdateUserRolesInput, UpdateUserStatusInput } from "./users.schema";

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
 * A user's effective plan is their active, not-yet-expired assignment if
 * one exists, else the plan marked isDefault — same resolution rule as
 * plans/plans.service.ts's resolveEffectivePlan, duplicated here (rather
 * than imported) because this needs it batched across many users at once
 * for a list/filter, not one user at a time.
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
    .where(and(sql`${userPlanAssignments.userId} IN ${ids}`, await activeAssignmentCondition()));

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
      // Anyone without ANY active assignment is implicitly on the default
      // plan — not just anyone without one to *this* plan.
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

export async function updateUserRoles(
  userId: string,
  input: UpdateUserRolesInput,
  adminUserId: string,
  ipAddress?: string,
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const [role] = await db.select().from(roles).where(eq(roles.name, input.role)).limit(1);
  if (!role) {
    throw new AppError(`Unknown role "${input.role}"`, 400, "BAD_REQUEST");
  }

  const beforeRoles = (
    await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
  ).map((r) => r.name);

  if (input.action === "grant") {
    await db
      .insert(userRoles)
      .values({ userId, roleId: role.id, assignedBy: adminUserId })
      .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
  } else {
    await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)));
  }

  const afterRoles = (
    await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
  ).map((r) => r.name);

  await logAdminAction({
    adminUserId,
    action: input.action === "grant" ? "user.role.granted" : "user.role.revoked",
    targetType: "user",
    targetId: userId,
    beforeValue: { roles: beforeRoles },
    afterValue: { roles: afterRoles },
    ipAddress,
  });

  return { userId, roles: afterRoles };
}

export async function updateUserStatus(
  userId: string,
  input: UpdateUserStatusInput,
  adminUserId: string,
  ipAddress?: string,
) {
  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!before) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const [after] = await db
    .update(users)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  await logAdminAction({
    adminUserId,
    action: "user.status.updated",
    targetType: "user",
    targetId: userId,
    beforeValue: { status: before.status },
    afterValue: { status: after.status },
    ipAddress,
  });

  if (before.status !== after.status) {
    const { subject, html } = userStatusChangedEmailTemplate({ name: after.name, status: after.status });
    sendEmail({
      to: after.email,
      recipientUserId: after.id,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: EmailTemplateKey.USER_STATUS_CHANGED,
      subject,
      html,
    }).catch((err) => logger.warn({ err, userId }, "Failed to enqueue status-change email"));
  }

  return after;
}

/**
 * Immediate, irreversible account wipe — a dev convenience for clearing out
 * test accounts, not something to expose against real users. Refused
 * outright in production (rather than merely hidden in the UI) so it can't
 * be reached by calling the endpoint directly. Reuses hardDeleteAccount, so
 * sessions and vector-store entries are cleaned up the same way as a real
 * account deletion.
 */
/**
 * An admin adds an account directly: name, email, a temporary password to
 * pass on, and a role. Works even with public signups off — that's the
 * point on a private self-hosted install. Needs email + password sign-in
 * (always on when self-hosted).
 */
export async function createUserByAdmin(input: CreateUserInput, adminUserId: string, ipAddress?: string) {
  if (!(await isPasswordAuthEnabled())) {
    throw new AppError("Email and password sign-in is turned off", 409, "PASSWORD_AUTH_DISABLED");
  }
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new AppError("An account with this email already exists", 409, "EMAIL_TAKEN");

  const [user] = await db
    .insert(users)
    .values({
      email,
      name: input.name.trim(),
      status: UserStatus.ACTIVE,
      emailVerified: false,
      passwordHash: await hashPassword(input.password),
    })
    .returning();
  await assignDefaultRole(user.id);
  if (input.role === "admin") await assignAdminRole(user.id);

  await logAdminAction({
    adminUserId,
    action: "user.created",
    targetType: "user",
    targetId: user.id,
    beforeValue: null,
    afterValue: { email, role: input.role },
    ipAddress,
  });
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Sets a new password for someone (e.g. they forgot it and email is off), and
 * signs them out everywhere so the old password's sessions end.
 */
export async function setUserPassword(userId: string, input: SetUserPasswordInput, adminUserId: string, ipAddress?: string) {
  if (!(await isPasswordAuthEnabled())) {
    throw new AppError("Email and password sign-in is turned off", 409, "PASSWORD_AUTH_DISABLED");
  }
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw new AppError("User not found", 404, "NOT_FOUND");

  await db.update(users).set({ passwordHash: await hashPassword(input.password), updatedAt: new Date() }).where(eq(users.id, userId));
  if (userId !== adminUserId) await revokeAllSessionsForUser(userId);

  // Never the password itself.
  await logAdminAction({
    adminUserId,
    action: "user.password.set",
    targetType: "user",
    targetId: userId,
    beforeValue: null,
    afterValue: null,
    ipAddress,
  });
}

export async function deleteUserForDev(userId: string, adminUserId: string, ipAddress?: string) {
  // A self-hosted install runs with NODE_ENV=production, and its admin is the
  // operator, so deleting accounts is theirs to do.
  if (env.NODE_ENV === "production" && !env.SELF_HOSTED) {
    throw new AppError("Deleting users from the admin panel is disabled in production", 403, "FORBIDDEN");
  }
  if (userId === adminUserId) {
    throw new AppError("You can't delete your own account from here", 400, "BAD_REQUEST");
  }

  const [target] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  await hardDeleteAccount(userId);

  await logAdminAction({
    adminUserId,
    action: "user.deleted",
    targetType: "user",
    targetId: userId,
    beforeValue: { email: target.email },
    ipAddress,
  });
}
