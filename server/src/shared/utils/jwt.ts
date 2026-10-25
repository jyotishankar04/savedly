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
 * Unsalted SHA-256 for looking a refresh token up by hash. Not a password hash: anything
 * user-chosen goes through modules/share/share.password.ts.
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
 * Returns null on any failure: a missing or stale unlock cookie means "show the password form", never a 500.
 * Callers must compare each entry's `pv` to the share's current passwordUpdatedAt, which is what makes a password change revoke every cookie already issued, with no server-side tracking.
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

// A short sliding window, not a long-lived cookie: the vault holds hidden content, so re-issuing on
// each vault request (see requireVaultUnlocked) makes it "unlocked while active".
const VAULT_TOKEN_TTL = "30m";

export function signVaultToken(payload: VaultTokenPayload): string {
  return jwt.sign(payload, env.VAULT_TOKEN_SECRET, { expiresIn: VAULT_TOKEN_TTL });
}

/**
 * Returns null on any failure: a missing, expired or stale unlock cookie means "show the PIN form", never a 500.
 * Callers must compare `pv` to the user's current vaultPinUpdatedAt, which is what makes a PIN change revoke every cookie already issued.
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
 * Carries the initiating user's id across a calendar-connect OAuth redirect. The connect route is
 * authenticated, but Google's callback has no session cookie, so this token (the OAuth `state`)
 * tells the callback who started it.
 */
export interface CalendarStateTokenPayload {
  typ: "calendar_connect";
  userId: string;
  provider: "google";
}

// Matches the login flow's state-cookie window (OAUTH_STATE_COOKIE, 10 minutes): enough for the
// consent screen, short enough that a leaked state token is soon useless.
const CALENDAR_STATE_TTL = "10m";

export function signCalendarStateToken(payload: CalendarStateTokenPayload): string {
  return jwt.sign(payload, env.CALENDAR_STATE_SECRET, { expiresIn: CALENDAR_STATE_TTL });
}

/**
 * Returns null on any failure — an invalid/expired/tampered state means "reject the callback,"
 * never a 500.
 */
export function verifyCalendarStateToken(token: string): CalendarStateTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.CALENDAR_STATE_SECRET) as CalendarStateTokenPayload & jwt.JwtPayload;
    if (
      payload.typ !== "calendar_connect" ||
      typeof payload.userId !== "string" ||
      payload.provider !== "google"
    )
      return null;
    return { typ: "calendar_connect", userId: payload.userId, provider: payload.provider };
  } catch {
    return null;
  }
}

/**
 * Carried through GitHub's consent screen as `state`, so the callback knows which signed-in user
 * asked to connect.
 */
export function signGithubStateToken(userId: string): string {
  return jwt.sign({ typ: "github_connect", userId }, env.CALENDAR_STATE_SECRET, { expiresIn: CALENDAR_STATE_TTL });
}

/**
 * The user id from a valid state token, or null for anything expired, tampered with or meant for
 * another flow.
 */
export function verifyGithubStateToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.CALENDAR_STATE_SECRET) as jwt.JwtPayload;
    return payload.typ === "github_connect" && typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}
