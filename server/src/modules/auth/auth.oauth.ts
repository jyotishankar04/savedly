import { Provider } from "../../db/enums";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { requireOAuthCredentials } from "./oauth-config";

export interface OAuthProfile {
  provider: Provider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  providerData: Record<string, unknown>;
}

const GITHUB_USER_AGENT = "savedly-server";

// Google allows only bare "localhost" as an unverified redirect host, so the callback is SERVER_URL-based.
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
