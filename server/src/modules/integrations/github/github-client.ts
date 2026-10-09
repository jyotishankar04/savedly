import { env } from "../../../config/env";
import { getOAuthCredentials, requireOAuthCredentials } from "../../auth/oauth-config";

// Talks to GitHub for the "GitHub stars" integration. It reuses the OAuth app
// that powers "Sign in with GitHub", so there is nothing extra to set up.

// GitHub only accepts a redirect that sits under the app's registered callback
// URL. The sign-in callback is /api/v1/auth/github/callback, so this one
// lives beneath it and the same OAuth app covers both.
export const GITHUB_STARS_CALLBACK_PATH = "/auth/github/callback/stars";
const callbackUrl = () => `${env.SERVER_URL}/api/v1${GITHUB_STARS_CALLBACK_PATH}`;

// Enough to know who connected. Reading the stars someone has made public
// needs no further permission, and private repositories would need "repo",
// which is far more access than this feature should ever hold.
export const GITHUB_STARS_SCOPE = "read:user";

const API = "https://api.github.com";
const HEADERS = { "User-Agent": "savedly-server", "X-GitHub-Api-Version": "2022-11-28" };

/** GitHub said the token is no longer valid: the user revoked access, or the token was reset. */
export class GithubAuthError extends Error {
  constructor() {
    super("GitHub rejected the saved token");
    this.name = "GithubAuthError";
  }
}

export async function isGithubStarsConfigured(): Promise<boolean> {
  return !!(await getOAuthCredentials("github"));
}

export async function buildGithubStarsAuthUrl(state: string): Promise<string> {
  const { clientId } = await requireOAuthCredentials("github");
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl(), scope: GITHUB_STARS_SCOPE, state });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubStarsCode(code: string): Promise<{ accessToken: string; scope: string }> {
  const { clientId, clientSecret } = await requireOAuthCredentials("github");
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...HEADERS },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUrl() }),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json()) as { access_token?: string; scope?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? "GitHub didn't return a token");
  return { accessToken: data.access_token, scope: data.scope ?? "" };
}

async function api<T>(token: string, path: string, accept = "application/vnd.github+json"): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { ...HEADERS, Accept: accept, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 401) throw new GithubAuthError();
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${path.split("?")[0]}`);
  return (await response.json()) as T;
}

export async function getGithubViewer(token: string): Promise<{ id: string; login: string }> {
  const user = await api<{ id: number; login: string }>(token, "/user");
  return { id: String(user.id), login: user.login };
}

export interface StarredRepo {
  starredAt: string;
  fullName: string;
  url: string;
  description: string | null;
  topics: string[];
  language: string | null;
}

export const STARS_PAGE_SIZE = 100;

/**
 * One page of the account's stars, newest first. Private repositories are
 * left out of `repos`, so `isLastPage` is worked out from what GitHub sent,
 * not from how many were kept.
 */
export async function listStarredRepos(token: string, page: number): Promise<{ repos: StarredRepo[]; isLastPage: boolean }> {
  // The "star" media type is what adds starred_at, which is how a sync knows where it left off.
  const rows = await api<{ starred_at: string; repo: { full_name: string; html_url: string; description: string | null; topics?: string[]; language: string | null; private: boolean } }[]>(
    token,
    `/user/starred?per_page=${STARS_PAGE_SIZE}&sort=created&direction=desc&page=${page}`,
    "application/vnd.github.star+json",
  );
  const repos = rows
    .filter((row) => !row.repo.private)
    .map((row) => ({
      starredAt: row.starred_at,
      fullName: row.repo.full_name,
      url: row.repo.html_url,
      description: row.repo.description,
      topics: row.repo.topics ?? [],
      language: row.repo.language,
    }));
  return { repos, isLastPage: rows.length < STARS_PAGE_SIZE };
}

/** Tells GitHub to forget this user's grant. Best effort: disconnecting must work even if GitHub is down. */
export async function revokeGithubToken(token: string): Promise<void> {
  const credentials = await getOAuthCredentials("github");
  if (!credentials) return;
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  await fetch(`${API}/applications/${credentials.clientId}/token`, {
    method: "DELETE",
    headers: { ...HEADERS, Accept: "application/vnd.github+json", Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}
