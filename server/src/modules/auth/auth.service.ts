import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { authIdentities, devices, refreshTokens, roles, sessions, userOnboarding, userRoles, users } from "../../db/schema";
import { Provider, UserStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { buildDeviceFingerprint, parseUserAgent } from "../../shared/utils/device-fingerprint";
import { parseDurationMs } from "../../shared/utils/duration";
import { generateRefreshToken, hashToken, signAccessToken } from "../../shared/utils/jwt";
import { isSignupsEnabled } from "../feature-flags/feature-flags.service";

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

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildGithubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
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
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
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

    await db
      .update(authIdentities)
      .set({ providerData: profile.providerData })
      .where(eq(authIdentities.id, existingIdentity.id));

    await syncAvatar(user.id, user.avatarUrl, profile.avatarUrl);

    return { user, isNewUser: false };
  }

  const [userByEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);

  if (userByEmail) {
    await db.insert(authIdentities).values({
      userId: userByEmail.id,
      provider: profile.provider,
      providerId: profile.providerId,
      providerData: profile.providerData,
    });

    await syncAvatar(userByEmail.id, userByEmail.avatarUrl, profile.avatarUrl);

    return { user: userByEmail, isNewUser: false };
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
  const [defaultRole] = await db.select().from(roles).where(eq(roles.name, "free_user")).limit(1);

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

  return {
    ...user,
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
