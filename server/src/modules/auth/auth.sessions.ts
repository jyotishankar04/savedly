import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { devices, refreshTokens, roles, sessions, users } from "../../db/schema";
import { UserStatus } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { buildDeviceFingerprint, parseUserAgent } from "../../shared/utils/device-fingerprint";
import { parseDurationMs } from "../../shared/utils/duration";
import { generateRefreshToken, hashToken, signAccessToken } from "../../shared/utils/jwt";
import { getUserWithRoles } from "./auth.users";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
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
