import type { Response } from "express";
import { env } from "../../config/env";
import { parseDurationMs } from "./duration";

export const ACCESS_TOKEN_COOKIE = "savedly_access_token";
export const REFRESH_TOKEN_COOKIE = "savedly_refresh_token";
export const OAUTH_STATE_COOKIE = "savedly_oauth_state";
export const OAUTH_NEXT_COOKIE = "savedly_oauth_next";
export const SHARE_TOKEN_COOKIE = "savedly_share_token";
export const VAULT_TOKEN_COOKIE = "savedly_vault_token";

const AUTH_PATH = "/api/v1/auth";
const SHARE_PATH = "/api/v1/s";
const SHARE_TOKEN_MAX_AGE = 12 * 60 * 60 * 1000;
// Unlike the share-token cookie (scoped to /api/v1/s), vault-gated content is on ordinary /memories
// and /collections routes via a query toggle, so this cookie rides on the whole API or the guard
// would never see it.
const VAULT_PATH = "/api/v1";

const baseCookieOptions = {
  httpOnly: true,
  // A self-hosted install is often on plain http:// at home, where browsers drop Secure cookies and
  // sign-in silently fails, so it follows the public URL's scheme.
  secure: env.SELF_HOSTED ? env.FRONTEND_URL.startsWith("https://") : env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    path: "/",
    maxAge: parseDurationMs(env.JWT_ACCESS_EXPIRES_IN),
  });

  // Scoped to /auth so the refresh token isn't sent on every ordinary API request.
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    path: AUTH_PATH,
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions, path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions, path: AUTH_PATH });
}

export function setOAuthStateCookie(res: Response, state: string) {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...baseCookieOptions,
    path: AUTH_PATH,
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthStateCookie(res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE, { ...baseCookieOptions, path: AUTH_PATH });
}

// Where to land after OAuth when sign-in began from a shared link. Holds only a validated same-site
// path (assertSafeNextPath in the auth module), with the state cookie's 10-minute life.
export function setOAuthNextCookie(res: Response, next: string) {
  res.cookie(OAUTH_NEXT_COOKIE, next, {
    ...baseCookieOptions,
    path: AUTH_PATH,
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthNextCookie(res: Response) {
  res.clearCookie(OAUTH_NEXT_COOKIE, { ...baseCookieOptions, path: AUTH_PATH });
}

// Scoped to the public share routes so an unlock proof isn't sent with every other API call.
export function setShareTokenCookie(res: Response, token: string) {
  res.cookie(SHARE_TOKEN_COOKIE, token, {
    ...baseCookieOptions,
    path: SHARE_PATH,
    maxAge: SHARE_TOKEN_MAX_AGE,
  });
}

export function clearShareTokenCookie(res: Response) {
  res.clearCookie(SHARE_TOKEN_COOKIE, { ...baseCookieOptions, path: SHARE_PATH });
}

// Scoped to the whole API (see VAULT_PATH). No `maxAge` on purpose: a session cookie dies when the
// browser closes, and the 30-minute idle timeout comes from the token's own `exp` (signVaultToken),
// re-issued on each vault-gated request, so it stays unlocked until you close the browser or go
// quiet for 30 minutes.
export function setVaultTokenCookie(res: Response, token: string) {
  res.cookie(VAULT_TOKEN_COOKIE, token, { ...baseCookieOptions, path: VAULT_PATH });
}

export function clearVaultTokenCookie(res: Response) {
  res.clearCookie(VAULT_TOKEN_COOKIE, { ...baseCookieOptions, path: VAULT_PATH });
}
