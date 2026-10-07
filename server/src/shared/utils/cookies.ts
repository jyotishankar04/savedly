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
// Unlike the share-token cookie (scoped tightly to /api/v1/s, since every
// gated read lives under that one prefix), the vault-gated content lives on
// ordinary /memories and /collections routes via a query toggle — so this
// cookie has to ride on the whole API, the same way the access token does,
// or the guard middleware on those routes would never see it.
const VAULT_PATH = "/api/v1";

const baseCookieOptions = {
  httpOnly: true,
  // A self-hosted install is often reached over plain http:// on a home
  // network, where browsers drop Secure cookies and sign-in silently fails —
  // so there it follows the public URL's scheme instead.
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

// Where to land after OAuth completes, when the sign-in started from a
// shared link ("sign in to view this"). Only ever holds a validated
// same-site path — see assertSafeNextPath in the auth module. Same 10-minute
// life as the state cookie: it belongs to one OAuth round trip.
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

// Scoped to the public share routes so an unlock proof isn't attached to
// every other API call the browser makes.
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

// Scoped to the whole API (see VAULT_PATH above) — it has to reach
// /memories and /collections, not just /vault itself. Deliberately no
// `maxAge` — a plain session cookie dies the moment the whole browser (not
// just this tab) closes. The 30-minute idle timeout is enforced by the
// token's own `exp` claim instead (see signVaultToken), and re-issued on
// every authenticated vault-gated request while active — the combination is
// what gives "unlocked until you close the browser or go quiet for 30
// minutes."
export function setVaultTokenCookie(res: Response, token: string) {
  res.cookie(VAULT_TOKEN_COOKIE, token, { ...baseCookieOptions, path: VAULT_PATH });
}

export function clearVaultTokenCookie(res: Response) {
  res.clearCookie(VAULT_TOKEN_COOKIE, { ...baseCookieOptions, path: VAULT_PATH });
}
