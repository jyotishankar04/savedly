import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { AppError } from "../../shared/errors/app-error";
import { getClientIp } from "../../shared/utils/device-fingerprint";
import { isProviderEnabled, isSignupsEnabled } from "../feature-flags/feature-flags.service";
import {
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  clearOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
} from "../../shared/utils/cookies";
import {
  assignDefaultRole,
  buildGithubAuthUrl,
  buildGoogleAuthUrl,
  exchangeGithubCode,
  exchangeGoogleCode,
  findOrCreateUser,
  getUserWithRoles,
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  type OAuthProfile,
} from "./auth.service";

// A "mobile:" prefix on the OAuth `state` (itself still checked byte-for-byte
// against the httpOnly cookie, so CSRF protection is unchanged) is how the
// callback tells a mobile-originated request apart from a web one, without a
// second cookie to keep in sync.
const MOBILE_STATE_PREFIX = "mobile:";

function extractBodyRefreshToken(req: Request): string | null {
  const value = req.body?.refreshToken;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isMobileRequest(req: Request): boolean {
  return req.query.platform === "mobile";
}

function buildOAuthState(req: Request): string {
  return isMobileRequest(req) ? `${MOBILE_STATE_PREFIX}${crypto.randomUUID()}` : crypto.randomUUID();
}

function loginUrl(error: string, isMobile: boolean): string {
  return isMobile ? `${env.MOBILE_SCHEME}://auth?error=${error}` : `${env.FRONTEND_URL}/auth/login?error=${error}`;
}

async function handleOAuthCallback(req: Request, res: Response, exchangeCode: (code: string) => Promise<OAuthProfile>) {
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
  clearOAuthStateCookie(res);

  const { code, state, error: providerError } = req.query as { code?: string; state?: string; error?: string };
  // state may be missing entirely on some failure modes (e.g. the provider
  // errors before ever echoing it back) — in that case there's no way to
  // know which surface to redirect to, so this falls back to the web login
  // page rather than guessing.
  const isMobile = Boolean(state?.startsWith(MOBILE_STATE_PREFIX));

  if (providerError) {
    return res.redirect(loginUrl("oauth_denied", isMobile));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return res.redirect(loginUrl("oauth_invalid_state", isMobile));
  }

  try {
    const profile = await exchangeCode(code);
    const { user, isNewUser } = await findOrCreateUser(profile);

    if (isNewUser) {
      await assignDefaultRole(user.id);
    }

    const userWithRoles = await getUserWithRoles(user.id);
    const tokens = await issueTokenPair(
      user,
      userWithRoles.roles,
      getClientIp(req),
      req.headers["user-agent"] ?? "",
    );

    if (isMobile) {
      // No cookie jar to hand tokens to on a native app — put them in the
      // deep-link URL instead. (The provider's redirect_uri was also
      // mobile-specific for this whole request — see buildGoogleAuthUrl/
      // buildGithubAuthUrl — since the in-app browser that opens it runs on
      // the device/emulator itself, not this server's own host.)
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        onboardingCompleted: String(userWithRoles.onboardingCompleted),
      });
      return res.redirect(`${env.MOBILE_SCHEME}://auth?${params.toString()}`);
    }

    setAuthCookies(res, tokens);
    res.redirect(`${env.FRONTEND_URL}${userWithRoles.onboardingCompleted ? "/app" : "/onboard"}`);
  } catch {
    res.redirect(loginUrl("oauth_failed", isMobile));
  }
}

export class AuthController {
  static async initiateGoogle(req: Request, res: Response) {
    if (!(await isProviderEnabled("google"))) {
      throw new AppError("Google sign-in is currently disabled", 403, "PROVIDER_DISABLED");
    }
    const state = buildOAuthState(req);
    setOAuthStateCookie(res, state);
    res.redirect(buildGoogleAuthUrl(state));
  }

  static async initiateGithub(req: Request, res: Response) {
    if (!(await isProviderEnabled("github"))) {
      throw new AppError("GitHub sign-in is currently disabled", 403, "PROVIDER_DISABLED");
    }
    const state = buildOAuthState(req);
    setOAuthStateCookie(res, state);
    res.redirect(buildGithubAuthUrl(state));
  }

  static async providers(_req: Request, res: Response) {
    const [google, github, signupsEnabled] = await Promise.all([
      isProviderEnabled("google"),
      isProviderEnabled("github"),
      isSignupsEnabled(),
    ]);
    res.status(200).json(ApiResponse.success({ google, github, signupsEnabled }));
  }

  static async googleCallback(req: Request, res: Response) {
    await handleOAuthCallback(req, res, exchangeGoogleCode);
  }

  static async githubCallback(req: Request, res: Response) {
    await handleOAuthCallback(req, res, exchangeGithubCode);
  }

  static async refresh(req: Request, res: Response) {
    const cookieToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    // Mobile has no cookie jar the server can write to — it sends the
    // refresh token it stored itself (from expo-secure-store) in the body.
    const rawRefreshToken = cookieToken ?? extractBodyRefreshToken(req);
    if (!rawRefreshToken) {
      return res.status(401).json(ApiResponse.error("UNAUTHORIZED", "Not authenticated"));
    }

    const tokens = await rotateRefreshToken(rawRefreshToken, getClientIp(req), req.headers["user-agent"] ?? "");

    if (!cookieToken) {
      return res.status(200).json(ApiResponse.success({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
    }
    setAuthCookies(res, tokens);
    res.status(200).json(ApiResponse.success({ message: "Token refreshed" }));
  }

  static async logout(req: Request, res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? extractBodyRefreshToken(req);
    if (rawRefreshToken) {
      try {
        await revokeRefreshToken(rawRefreshToken, req.user!.id);
      } catch {
        // already revoked or unknown — logout is idempotent either way
      }
    }
    clearAuthCookies(res);
    res.status(200).json(ApiResponse.success({ message: "Logged out successfully" }));
  }

  static async me(req: Request, res: Response) {
    const user = await getUserWithRoles(req.user!.id);
    res.status(200).json(ApiResponse.success({ user }));
  }
}
