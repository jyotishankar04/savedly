import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { AppError } from "../../shared/errors/app-error";
import { getClientIp } from "../../shared/utils/device-fingerprint";
import { isPasswordAuthEnabled, isProviderEnabled, isSignupsEnabled } from "../feature-flags/feature-flags.service";
import { getOAuthCredentials } from "./oauth-config";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  clearOAuthNextCookie,
  clearOAuthStateCookie,
  setAuthCookies,
  setOAuthNextCookie,
  setOAuthStateCookie,
} from "../../shared/utils/cookies";
import { claimPendingGrantsForEmail } from "../share/share.service";
import { sendEmail } from "../email";
import { EmailCategory, EmailTemplateKey } from "../../db/enums";
import { welcomeEmailTemplate } from "../../shared/mailer/templates";
import {
  assignAdminRole,
  assignDefaultRole,
  buildGithubAuthUrl,
  buildGoogleAuthUrl,
  exchangeGithubCode,
  exchangeGoogleCode,
  findOrCreateUser,
  getUserWithRoles,
  hasAnyUser,
  issueTokenPair,
  loginWithPassword,
  registerWithPassword,
  revokeRefreshToken,
  rotateRefreshToken,
  type OAuthProfile,
} from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.schema";

/** A provider's sign-in button shows only when an admin both enabled it and it has client credentials. */
async function isProviderAvailable(provider: "google" | "github"): Promise<boolean> {
  const [enabled, credentials] = await Promise.all([isProviderEnabled(provider), getOAuthCredentials(provider)]);
  return enabled && !!credentials;
}

function sendWelcomeEmail(user: { id: string; email: string; name: string | null }) {
  // Never blocks/fails the signup itself — a failed welcome send
  // shouldn't fail account creation.
  const { subject, html } = welcomeEmailTemplate({ name: user.name });
  sendEmail({
    to: user.email,
    recipientUserId: user.id,
    category: EmailCategory.TRANSACTIONAL,
    templateKey: EmailTemplateKey.WELCOME,
    subject,
    html,
  }).catch(() => {});
}

async function startSession(req: Request, res: Response, user: { id: string; email: string }) {
  const userWithRoles = await getUserWithRoles(user.id);
  const tokens = await issueTokenPair(user, userWithRoles.roles, getClientIp(req), req.headers["user-agent"] ?? "");
  setAuthCookies(res, tokens);
  return userWithRoles;
}

function loginUrl(error: string): string {
  return `${env.FRONTEND_URL}/auth/login?error=${error}`;
}

/**
 * Where to send someone after sign-in, when they arrived from a shared
 * link ("sign in to view this").
 *
 * The allowlist is intentionally one exact shape — a shared-link path and
 * nothing else. This value comes in on a query string that is reachable
 * straight from an invite email, so anything looser is an open redirect
 * with a credible delivery mechanism attached. Rejecting rather than
 * sanitizing keeps that impossible to get subtly wrong: no protocol-relative
 * "//evil.com", no "/app/settings", no encoded traversal.
 */
const SAFE_NEXT_PATH = /^\/s\/[A-Za-z0-9_-]{1,32}$/;

export function sanitizeNextPath(next: unknown): string | null {
  return typeof next === "string" && SAFE_NEXT_PATH.test(next) ? next : null;
}

async function handleOAuthCallback(req: Request, res: Response, exchangeCode: (code: string) => Promise<OAuthProfile>) {
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
  // Re-validated on the way out as well as on the way in: the cookie is
  // ours and httpOnly, but the redirect is the dangerous side, so the check
  // belongs where the value is used.
  const nextPath = sanitizeNextPath(req.cookies?.[OAUTH_NEXT_COOKIE]);
  clearOAuthStateCookie(res);
  clearOAuthNextCookie(res);

  const { code, state, error: providerError } = req.query as { code?: string; state?: string; error?: string };

  if (providerError) {
    return res.redirect(loginUrl("oauth_denied"));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return res.redirect(loginUrl("oauth_invalid_state"));
  }

  try {
    const profile = await exchangeCode(code);
    const { user, isNewUser } = await findOrCreateUser(profile);

    if (isNewUser) {
      await assignDefaultRole(user.id);
      sendWelcomeEmail(user);
    }

    // Runs on every login, not just signup: an invite that arrives between
    // account creation and this point would otherwise sit pending until the
    // next sign-in. Only claims grants when the provider vouched for the
    // email — see claimPendingGrantsForEmail.
    await claimPendingGrantsForEmail(user.id, user.email, user.emailVerified).catch(() => {});

    const userWithRoles = await getUserWithRoles(user.id);
    const tokens = await issueTokenPair(
      user,
      userWithRoles.roles,
      getClientIp(req),
      req.headers["user-agent"] ?? "",
    );

    setAuthCookies(res, tokens);

    // Onboarding still comes first for a new account, but carries the
    // destination through so an invited user finishes on the thing they
    // were invited to rather than a generic dashboard.
    const destination = userWithRoles.onboardingCompleted
      ? (nextPath ?? "/app")
      : `/onboard${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

    res.redirect(`${env.FRONTEND_URL}${destination}`);
  } catch {
    res.redirect(loginUrl("oauth_failed"));
  }
}

export class AuthController {
  static async initiateGoogle(req: Request, res: Response) {
    if (!(await isProviderAvailable("google"))) {
      throw new AppError("Google sign-in is currently disabled", 403, "PROVIDER_DISABLED");
    }
    const state = crypto.randomUUID();
    setOAuthStateCookie(res, state);
    const next = sanitizeNextPath(req.query.next);
    if (next) setOAuthNextCookie(res, next);
    res.redirect(await buildGoogleAuthUrl(state));
  }

  static async initiateGithub(req: Request, res: Response) {
    if (!(await isProviderAvailable("github"))) {
      throw new AppError("GitHub sign-in is currently disabled", 403, "PROVIDER_DISABLED");
    }
    const state = crypto.randomUUID();
    setOAuthStateCookie(res, state);
    const next = sanitizeNextPath(req.query.next);
    if (next) setOAuthNextCookie(res, next);
    res.redirect(await buildGithubAuthUrl(state));
  }

  static async providers(_req: Request, res: Response) {
    const [google, github, password, signupsEnabled, anyUser] = await Promise.all([
      isProviderAvailable("google"),
      isProviderAvailable("github"),
      isPasswordAuthEnabled(),
      isSignupsEnabled(),
      hasAnyUser(),
    ]);
    // needsSetup: a fresh self-hosted install with no accounts yet — the
    // client shows "Create your admin account" instead of the sign-in page.
    res.status(200).json(
      ApiResponse.success({ google, github, password, signupsEnabled, needsSetup: env.SELF_HOSTED && !anyUser }),
    );
  }

  static async register(req: Request, res: Response) {
    if (!(await isPasswordAuthEnabled())) {
      throw new AppError("Email sign-up is disabled", 403, "PROVIDER_DISABLED");
    }
    const { user, isFirstUser } = await registerWithPassword(req.body as RegisterInput);
    await assignDefaultRole(user.id);
    // The first account on a self-hosted install owns it.
    if (isFirstUser && env.SELF_HOSTED) await assignAdminRole(user.id);
    sendWelcomeEmail(user);

    const userWithRoles = await startSession(req, res, user);
    res.status(201).json(ApiResponse.success({ user: userWithRoles }));
  }

  static async login(req: Request, res: Response) {
    if (!(await isPasswordAuthEnabled())) {
      throw new AppError("Email sign-in is disabled", 403, "PROVIDER_DISABLED");
    }
    const { email, password } = req.body as LoginInput;
    const user = await loginWithPassword(email, password);
    await claimPendingGrantsForEmail(user.id, user.email, user.emailVerified).catch(() => {});

    const userWithRoles = await startSession(req, res, user);
    res.status(200).json(ApiResponse.success({ user: userWithRoles }));
  }

  static async googleCallback(req: Request, res: Response) {
    await handleOAuthCallback(req, res, exchangeGoogleCode);
  }

  static async githubCallback(req: Request, res: Response) {
    await handleOAuthCallback(req, res, exchangeGithubCode);
  }

  static async refresh(req: Request, res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rawRefreshToken) {
      return res.status(401).json(ApiResponse.error("UNAUTHORIZED", "Not authenticated"));
    }

    const tokens = await rotateRefreshToken(rawRefreshToken, getClientIp(req), req.headers["user-agent"] ?? "");
    setAuthCookies(res, tokens);
    res.status(200).json(ApiResponse.success({ message: "Token refreshed" }));
  }

  static async logout(req: Request, res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
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
