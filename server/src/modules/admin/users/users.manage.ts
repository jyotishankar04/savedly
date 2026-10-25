import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { roles, users, userRoles } from "../../../db/schema";
import { EmailCategory, EmailTemplateKey, UserStatus } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { logger } from "../../../shared/utils/logger";
import { env } from "../../../config/env";
import { hardDeleteAccount, revokeAllSessionsForUser } from "../../account/api";
import { hashPassword } from "../../../shared/crypto/scrypt-password";
import { isPasswordAuthEnabled } from "../../feature-flags/api";
import { assignAdminRole, assignDefaultRole } from "../../auth/api";
import { sendEmail } from "../../email";
import { userStatusChangedEmailTemplate } from "../../../platform/mailer/templates";
import type { CreateUserInput, SetUserPasswordInput, UpdateUserRolesInput, UpdateUserStatusInput } from "./users.schema";

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
