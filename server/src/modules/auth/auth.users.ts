import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { authIdentities, roles, userOnboarding, userRoles, users } from "../../db/schema";
import { UserStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { isSignupsEnabled } from "../feature-flags/api";
import { ACCOUNT_DELETION_GRACE_DAYS } from "../account/api";
import { hashPassword, verifyPassword } from "../../shared/crypto/scrypt-password";
import { type OAuthProfile } from "./auth.oauth";

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
}

export interface UserWithRoles extends UserRecord {
  roles: string[];
  onboardingCompleted: boolean;
}

/**
 * Keeps the stored avatar in sync with the OAuth provider's current one, without clobbering it with
 * a null/missing value.
 */
async function syncAvatar(userId: string, currentAvatarUrl: string | null, providerAvatarUrl: string | null): Promise<void> {
  if (!providerAvatarUrl || providerAvatarUrl === currentAvatarUrl) return;
  await db.update(users).set({ avatarUrl: providerAvatarUrl }).where(eq(users.id, userId));
}

/**
 * Logging in during the grace period is the undo for a pending deletion. Returns null once the
 * grace period has elapsed (even if the sweep hasn't purged the row), and the caller must not let
 * the login succeed.
 */
async function reactivateIfWithinGracePeriod(user: UserRecord & { deletedAt?: Date | null }): Promise<UserRecord | null> {
  if (user.status !== UserStatus.DELETED) return null;
  const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  if (!user.deletedAt || user.deletedAt < cutoff) return null;
  const [reactivated] = await db
    .update(users)
    .set({ status: UserStatus.ACTIVE, deletedAt: null })
    .where(eq(users.id, user.id))
    .returning();
  return reactivated;
}

export async function findOrCreateUser(profile: OAuthProfile): Promise<{ user: UserRecord; isNewUser: boolean }> {
  const [existingIdentity] = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.provider, profile.provider), eq(authIdentities.providerId, profile.providerId)))
    .limit(1);

  if (existingIdentity) {
    const [user] = await db.select().from(users).where(eq(users.id, existingIdentity.userId)).limit(1);
    if (!user) {
      throw new AppError("User account not found for linked identity", 404, "NOT_FOUND");
    }

    const reactivated = await reactivateIfWithinGracePeriod(user);
    if (user.status === UserStatus.DELETED && !reactivated) {
      throw new AppError("This account is being deleted", 403, "ACCOUNT_DELETION_IN_PROGRESS");
    }

    await db
      .update(authIdentities)
      .set({ providerData: profile.providerData })
      .where(eq(authIdentities.id, existingIdentity.id));

    await syncAvatar(user.id, user.avatarUrl, profile.avatarUrl);

    return { user: reactivated ?? user, isNewUser: false };
  }

  const [userByEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);

  if (userByEmail) {
    const reactivated = await reactivateIfWithinGracePeriod(userByEmail);
    if (userByEmail.status === UserStatus.DELETED && !reactivated) {
      throw new AppError("This account is being deleted", 403, "ACCOUNT_DELETION_IN_PROGRESS");
    }

    await db.insert(authIdentities).values({
      userId: userByEmail.id,
      provider: profile.provider,
      providerId: profile.providerId,
      providerData: profile.providerData,
    });

    await syncAvatar(userByEmail.id, userByEmail.avatarUrl, profile.avatarUrl);

    return { user: reactivated ?? userByEmail, isNewUser: false };
  }

  if (!(await isSignupsEnabled())) {
    throw new AppError("New signups are currently disabled", 403, "SIGNUPS_DISABLED");
  }

  const [newUser] = await db
    .insert(users)
    .values({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      status: UserStatus.ACTIVE,
      emailVerified: profile.emailVerified,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
    })
    .returning();

  await db.insert(authIdentities).values({
    userId: newUser.id,
    provider: profile.provider,
    providerId: profile.providerId,
    providerData: profile.providerData,
  });

  return { user: newUser, isNewUser: true };
}

export async function assignDefaultRole(userId: string): Promise<void> {
  const [defaultRole] = await db.select().from(roles).where(eq(roles.name, "user")).limit(1);

  if (!defaultRole) {
    throw new AppError("Default role not seeded — run pnpm db:seed", 500, "ROLE_NOT_SEEDED");
  }

  await db
    .insert(userRoles)
    .values({ userId, roleId: defaultRole.id })
    .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
}

export async function getUserWithRoles(userId: string): Promise<UserWithRoles> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const [onboarding] = await db
    .select({ completedAt: userOnboarding.completedAt })
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, userId))
    .limit(1);

  // Credential hashes never leave the server (this object is what GET
  // /auth/me returns).
  const { passwordHash: _passwordHash, vaultPinHash: _vaultPinHash, ...safeUser } = user;

  return {
    ...safeUser,
    roles: roleRows.map((r) => r.name),
    onboardingCompleted: !!onboarding?.completedAt,
  };
}

// -----------------------------------------------------------------------------
// Email + password (self-hosted installs; a feature flag in hosted production)
// -----------------------------------------------------------------------------

export async function assignAdminRole(userId: string): Promise<void> {
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);
  if (!adminRole) {
    throw new AppError("Admin role not seeded — run pnpm db:seed", 500, "ROLE_NOT_SEEDED");
  }
  await db
    .insert(userRoles)
    .values({ userId, roleId: adminRole.id })
    .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
}

/**
 * True until the very first account exists — the self-hosted "create your admin account" screen
 * keys off this.
 */
export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).limit(1);
  return !!row;
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: UserRecord; isFirstUser: boolean }> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  // Serialized on an advisory lock so two sign-ups racing on a fresh install
  // can't both see "no users yet" and both become admin.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('savedly:first-user'))`);

    const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      // Never attach a password to an account someone created through
      // Google/GitHub — that would let anyone who knows the address claim it.
      throw new AppError(
        existing.passwordHash
          ? "An account with this email already exists. Sign in instead."
          : "This email is already used with Google or GitHub sign-in. Use that instead.",
        409,
        "EMAIL_TAKEN",
      );
    }

    const [anyUser] = await tx.select({ id: users.id }).from(users).limit(1);
    const isFirstUser = !anyUser;
    if (!isFirstUser && !(await isSignupsEnabled())) {
      throw new AppError("New signups are currently disabled", 403, "SIGNUPS_DISABLED");
    }

    const [user] = await tx
      .insert(users)
      .values({ email, name: input.name.trim(), status: UserStatus.ACTIVE, emailVerified: false, passwordHash })
      .returning();

    return { user, isFirstUser };
  });
}

export async function loginWithPassword(emailInput: string, password: string): Promise<UserRecord> {
  const email = emailInput.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // verifyPassword burns the same work when there's no hash, so a missing
  // account and a wrong password take the same time.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    throw new AppError("Email or password is incorrect", 401, "INVALID_CREDENTIALS");
  }

  const reactivated = await reactivateIfWithinGracePeriod(user);
  if (user.status === UserStatus.DELETED && !reactivated) {
    throw new AppError("This account is being deleted", 403, "ACCOUNT_DELETION_IN_PROGRESS");
  }
  if (user.status !== UserStatus.ACTIVE && !reactivated) {
    throw new AppError("This account is not active", 403, "ACCOUNT_INACTIVE");
  }
  return reactivated ?? user;
}
