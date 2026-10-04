import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { authIdentities, devices, refreshTokens, roles, sessions, userOnboarding, userRoles, users } from "../../db/schema";
import { Provider, UserStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { buildDeviceFingerprint, parseUserAgent } from "../../shared/utils/device-fingerprint";
import { parseDurationMs } from "../../shared/utils/duration";
import { generateRefreshToken, hashToken, signAccessToken } from "../../shared/utils/jwt";
import { isSignupsEnabled } from "../feature-flags/feature-flags.service";
import { ACCOUNT_DELETION_GRACE_DAYS } from "../account/account.service";
import { requireOAuthCredentials } from "./oauth-config";
import { hashPassword, verifyPassword } from "../../shared/crypto/scrypt-password";

export interface OAuthProfile {
  provider: Provider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  providerData: Record<string, unknown>;
}

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

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const GITHUB_USER_AGENT = "memora-server";

// Google only allows "localhost" (bare, no other IP/hostname) as an
// unverified-domain exception for OAuth redirect URIs — an emulator-only
// alias like 10.0.2.2 is rejected outright by Google's own console, so
// mobile can't get its own callback URL variant the way the deep-link
// destination can. Mobile local dev instead relies on `adb reverse
// tcp:4000 tcp:4000`, which makes the emulator's own "localhost" actually
// reach this machine — so the same SERVER_URL-based callback works for both.
const GOOGLE_CALLBACK_URL = `${env.SERVER_URL}/api/v1/auth/google/callback`;
const GITHUB_CALLBACK_URL = `${env.SERVER_URL}/api/v1/auth/github/callback`;

export async function buildGoogleAuthUrl(state: string): Promise<string> {
  const { clientId } = await requireOAuthCredentials("google");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function buildGithubAuthUrl(state: string): Promise<string> {
  const { clientId } = await requireOAuthCredentials("github");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const google = await requireOAuthCredentials("google");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new AppError("Failed to exchange Google authorization code", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new AppError("Failed to fetch Google profile", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const profile = (await profileResponse.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
  };

  return {
    provider: Provider.GOOGLE,
    providerId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified,
    name: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
    providerData: profile,
  };
}

export async function exchangeGithubCode(code: string): Promise<OAuthProfile> {
  const github = await requireOAuthCredentials("github");
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: github.clientId,
      client_secret: github.clientSecret,
      redirect_uri: GITHUB_CALLBACK_URL,
    }),
  });

  if (!tokenResponse.ok) {
    throw new AppError("Failed to exchange GitHub authorization code", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const tokenBody = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenBody.access_token) {
    throw new AppError("Failed to exchange GitHub authorization code", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const githubHeaders = {
    Authorization: `Bearer ${tokenBody.access_token}`,
    "User-Agent": GITHUB_USER_AGENT,
    Accept: "application/vnd.github+json",
  };

  const profileResponse = await fetch("https://api.github.com/user", { headers: githubHeaders });
  if (!profileResponse.ok) {
    throw new AppError("Failed to fetch GitHub profile", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const profile = (await profileResponse.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
    email: string | null;
  };

  let email = profile.email;
  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", { headers: githubHeaders });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as { email: string; primary: boolean; verified: boolean }[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }
  }

  if (!email) {
    throw new AppError("GitHub account has no verified email available", 400, "GITHUB_EMAIL_UNAVAILABLE");
  }

  return {
    provider: Provider.GITHUB,
    providerId: String(profile.id),
    email,
    emailVerified: true,
    name: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url,
    providerData: profile,
  };
}

/** Keeps the stored avatar in sync with the OAuth provider's current one, without clobbering it with a null/missing value. */
async function syncAvatar(userId: string, currentAvatarUrl: string | null, providerAvatarUrl: string | null): Promise<void> {
  if (!providerAvatarUrl || providerAvatarUrl === currentAvatarUrl) return;
  await db.update(users).set({ avatarUrl: providerAvatarUrl }).where(eq(users.id, userId));
}

/**
 * Cancellation mechanism for a pending soft account deletion — logging back
 * in during the grace period IS the undo, no separate cancel button needed.
 * Returns null (do NOT reactivate) once the grace period has elapsed, even
 * if the sweep job hasn't purged the row yet — the caller must treat that
 * as "this account is on its way out", not silently let login succeed.
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

export async function issueTokenPair(
  user: { id: string; email: string },
  roleNames: string[],
  ip: string,
  userAgent: string,
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: roleNames });
  const rawRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  const [refreshTokenRow] = await db
    .insert(refreshTokens)
    .values({ userId: user.id, token: hashToken(rawRefreshToken), expiresAt, ipAddress: ip })
    .returning();

  await recordSession(user.id, refreshTokenRow.id, ip, userAgent);

  return { accessToken, refreshToken: rawRefreshToken };
}

export async function recordSession(userId: string, refreshTokenId: string, ip: string, userAgent: string): Promise<void> {
  const fingerprint = buildDeviceFingerprint(ip, userAgent);
  const { platform, browser, deviceType } = parseUserAgent(userAgent);

  const [device] = await db
    .insert(devices)
    .values({ userId, deviceFingerprint: fingerprint, platform, browser, deviceType, ipAddress: ip })
    .onConflictDoUpdate({
      target: [devices.userId, devices.deviceFingerprint],
      set: { lastUsedAt: new Date(), ipAddress: ip, platform, browser, deviceType },
    })
    .returning();

  const [existingSession] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.deviceId, device.id)))
    .limit(1);

  if (existingSession) {
    await db
      .update(sessions)
      .set({ refreshTokenId, ipAddress: ip, userAgent, lastActivityAt: new Date() })
      .where(eq(sessions.id, existingSession.id));
  } else {
    await db.insert(sessions).values({
      userId,
      refreshTokenId,
      deviceId: device.id,
      ipAddress: ip,
      userAgent,
    });
  }
}

export async function rotateRefreshToken(rawToken: string, ip: string, userAgent: string): Promise<TokenPair> {
  const hashed = hashToken(rawToken);
  const [tokenRow] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, hashed)).limit(1);

  if (!tokenRow || tokenRow.revoked || tokenRow.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED");
  }

  const [user] = await db.select().from(users).where(eq(users.id, tokenRow.userId)).limit(1);
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AppError("Account is not active", 403, "FORBIDDEN");
  }

  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, tokenRow.id));

  const { roles: roleNames } = await getUserWithRoles(user.id);
  return issueTokenPair(user, roleNames, ip, userAgent);
}

export async function revokeRefreshToken(rawToken: string, userId: string): Promise<void> {
  const hashed = hashToken(rawToken);
  const [tokenRow] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, hashed), eq(refreshTokens.userId, userId)))
    .limit(1);

  if (!tokenRow) {
    throw new AppError("Refresh token not found", 404, "NOT_FOUND");
  }

  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, tokenRow.id));
  await db.update(sessions).set({ refreshTokenId: null }).where(eq(sessions.refreshTokenId, tokenRow.id));
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

/** True until the very first account exists — the self-hosted "create your admin account" screen keys off this. */
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
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('saveforlatter:first-user'))`);

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
