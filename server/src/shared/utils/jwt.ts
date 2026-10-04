import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & jwt.JwtPayload;
  } catch {
    throw new AppError("Invalid or expired access token", 401, "UNAUTHORIZED");
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Unsalted SHA-256, for looking a refresh token up by its hash.
 *
 * NOT a password hash — it's deliberately fast and has no salt. Anything
 * user-chosen goes through modules/share/share.password.ts instead.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Proof that a visitor entered the password for one or more shared links. */
export interface ShareTokenPayload {
  /** Discriminator checked on verify, so this can never be read as an access token. */
  typ: "share";
  /** `pv` is the share's passwordUpdatedAt epoch — see verifyShareToken. */
  shares: { id: string; pv: number }[];
}

const SHARE_TOKEN_TTL = "12h";

export function signShareToken(payload: ShareTokenPayload): string {
  return jwt.sign(payload, env.SHARE_TOKEN_SECRET, { expiresIn: SHARE_TOKEN_TTL });
}

/**
 * Returns null on any failure rather than throwing — an absent or stale
 * unlock cookie means "show the password form", never a 500.
 *
 * Callers must still compare each entry's `pv` against the share's current
 * passwordUpdatedAt: that's what makes changing the password revoke every
 * cookie already handed out, without tracking them server-side.
 */
export function verifyShareToken(token: string): ShareTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.SHARE_TOKEN_SECRET) as ShareTokenPayload & jwt.JwtPayload;
    if (payload.typ !== "share" || !Array.isArray(payload.shares)) return null;
    return { typ: "share", shares: payload.shares };
  } catch {
    return null;
  }
}

/** Proof that this browser entered the vault PIN, within the idle window. */
export interface VaultTokenPayload {
  typ: "vault";
  userId: string;
  /** The user's vaultPinUpdatedAt epoch — see verifyVaultToken. */
  pv: number;
}

// A short, sliding window rather than a long-lived cookie: the vault holds
// deliberately hidden content, so re-issuing on every authenticated vault
// request (see requireVaultUnlocked) is what makes this "unlocked while
// active" instead of "unlocked until this arbitrary long TTL expires
// regardless of activity."
const VAULT_TOKEN_TTL = "30m";

export function signVaultToken(payload: VaultTokenPayload): string {
  return jwt.sign(payload, env.VAULT_TOKEN_SECRET, { expiresIn: VAULT_TOKEN_TTL });
}

/**
 * Returns null on any failure — an absent, expired, or stale unlock cookie
 * means "show the PIN form," never a 500.
 *
 * Callers must still compare `pv` against the user's current
 * vaultPinUpdatedAt: that's what makes changing the PIN revoke every
 * cookie already handed out, without tracking them server-side.
 */
export function verifyVaultToken(token: string): VaultTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.VAULT_TOKEN_SECRET) as VaultTokenPayload & jwt.JwtPayload;
    if (payload.typ !== "vault" || typeof payload.userId !== "string" || typeof payload.pv !== "number") return null;
    return { typ: "vault", userId: payload.userId, pv: payload.pv };
  } catch {
    return null;
  }
}

/**
 * Carries the initiating user's id across a calendar-connect OAuth
 * redirect. The connect route (`GET /integrations/calendar/:provider/connect`) is
 * authenticated normally, but Google/Microsoft's callback redirect carries
 * no session cookie of its own — this token, passed as the OAuth `state`
 * param, is how the callback recovers who initiated the connection.
 */
export interface CalendarStateTokenPayload {
  typ: "calendar_connect";
  userId: string;
  provider: "google" | "microsoft";
}

// Matches the existing OAuth login flow's state-cookie window
// (OAUTH_STATE_COOKIE, 10 minutes) — plenty of time for the provider's own
// consent screen, short enough that a leaked/logged state token is useless
// soon after.
const CALENDAR_STATE_TTL = "10m";

export function signCalendarStateToken(payload: CalendarStateTokenPayload): string {
  return jwt.sign(payload, env.CALENDAR_STATE_SECRET, { expiresIn: CALENDAR_STATE_TTL });
}

/** Returns null on any failure — an invalid/expired/tampered state means "reject the callback," never a 500. */
export function verifyCalendarStateToken(token: string): CalendarStateTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.CALENDAR_STATE_SECRET) as CalendarStateTokenPayload & jwt.JwtPayload;
    if (
      payload.typ !== "calendar_connect" ||
      typeof payload.userId !== "string" ||
      (payload.provider !== "google" && payload.provider !== "microsoft")
    )
      return null;
    return { typ: "calendar_connect", userId: payload.userId, provider: payload.provider };
  } catch {
    return null;
  }
}
