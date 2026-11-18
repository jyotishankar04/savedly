import { env } from "../../../config/env";
import { isTokenCipherConfigured } from "../../../shared/crypto/token-cipher";

// Talks to Reddit for "Reddit saved posts and comments" integration.

export const REDDIT_CALLBACK_PATH = "/integrations/reddit/callback";
export const callbackUrl = () => `${env.SERVER_URL}/api/v1${REDDIT_CALLBACK_PATH}`;

// identity: to get the user's reddit username
// history: to read the user's saved posts and comments
// read: basic read access
export const REDDIT_SCOPE = "identity history read";

const OAUTH_API = "https://oauth.reddit.com";
const AUTH_URL = "https://www.reddit.com/api/v1/authorize";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

export class RedditAuthError extends Error {
  constructor(message = "Reddit rejected the saved token") {
    super(message);
    this.name = "RedditAuthError";
  }
}

export function isRedditConfigured(): boolean {
  return isTokenCipherConfigured() && Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET);
}

function getCredentials(): { clientId: string; clientSecret: string } {
  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) {
    throw new Error("Reddit integration is not configured on this server");
  }
  return { clientId: env.REDDIT_CLIENT_ID, clientSecret: env.REDDIT_CLIENT_SECRET };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildRedditAuthUrl(state: string): string {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: callbackUrl(),
    duration: "permanent", // Crucial for receiving a refresh_token
    scope: REDDIT_SCOPE,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface RedditTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
}

export async function exchangeRedditCode(code: string): Promise<RedditTokenResponse> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl(),
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.REDDIT_USER_AGENT,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error || data.message || `Reddit token exchange failed (${response.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope ?? REDDIT_SCOPE,
  };
}

export async function refreshRedditToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.REDDIT_USER_AGENT,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 401 || response.status === 400) {
    throw new RedditAuthError("Reddit refresh token has expired or was revoked");
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new RedditAuthError(data.error ?? "Failed to refresh Reddit access token");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

async function redditApi<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${OAUTH_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": env.REDDIT_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (response.status === 401) {
    throw new RedditAuthError();
  }
  if (!response.ok) {
    throw new Error(`Reddit API answered ${response.status} for ${path.split("?")[0]}`);
  }
  return (await response.json()) as T;
}

export async function getRedditViewer(accessToken: string): Promise<{ username: string }> {
  const user = await redditApi<{ name: string }>(accessToken, "/api/v1/me");
  return { username: user.name };
}

export interface RedditSavedItem {
  fullname: string; // e.g. "t3_xxxx" or "t1_yyyy"
  kind: "post" | "comment";
  id: string;
  title: string;
  url: string;
  content: string | null;
  author: string;
  subreddit: string;
  score: number;
  permalink: string;
  createdUtc: number; // Unix timestamp in seconds
}

export const REDDIT_PAGE_SIZE = 100;

interface RawRedditPost {
  id: string;
  name: string;
  title: string;
  author: string;
  subreddit: string;
  subreddit_name_prefixed?: string;
  selftext?: string;
  url: string;
  permalink: string;
  score: number;
  num_comments?: number;
  created_utc: number;
  is_self?: boolean;
}

interface RawRedditComment {
  id: string;
  name: string;
  author: string;
  subreddit: string;
  body: string;
  permalink: string;
  link_title?: string;
  link_url?: string;
  score: number;
  created_utc: number;
}

type RedditChild =
  | { kind: "t3"; data: RawRedditPost }
  | { kind: "t1"; data: RawRedditComment }
  | { kind: string; data: Record<string, unknown> };

interface RedditListingResponse {
  kind: "Listing";
  data: {
    after: string | null;
    dist?: number;
    children: RedditChild[];
  };
}

export async function listRedditSaved(
  accessToken: string,
  username: string,
  afterCursor?: string | null,
): Promise<{ items: RedditSavedItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(REDDIT_PAGE_SIZE) });
  if (afterCursor) {
    query.set("after", afterCursor);
  }

  const res = await redditApi<RedditListingResponse>(accessToken, `/user/${username}/saved?${query.toString()}`);

  const items: RedditSavedItem[] = [];
  for (const child of res.data.children) {
    if (child.kind === "t3") {
      const p = child.data as RawRedditPost;
      const isSelf = p.is_self || !p.url || p.url.includes("reddit.com");
      const url = isSelf ? `https://www.reddit.com${p.permalink}` : p.url;
      items.push({
        fullname: p.name,
        kind: "post",
        id: p.id,
        title: p.title,
        url,
        content: p.selftext?.trim() ? p.selftext.trim() : null,
        author: p.author,
        subreddit: p.subreddit,
        score: p.score ?? 0,
        permalink: `https://www.reddit.com${p.permalink}`,
        createdUtc: p.created_utc,
      });
    } else if (child.kind === "t1") {
      const c = child.data as RawRedditComment;
      items.push({
        fullname: c.name,
        kind: "comment",
        id: c.id,
        title: `Comment by u/${c.author} on "${c.link_title || "Reddit"}"`,
        url: `https://www.reddit.com${c.permalink}`,
        content: c.body?.trim() ? c.body.trim() : null,
        author: c.author,
        subreddit: c.subreddit,
        score: c.score ?? 0,
        permalink: `https://www.reddit.com${c.permalink}`,
        createdUtc: c.created_utc,
      });
    }
  }

  return {
    items,
    nextCursor: res.data.after,
  };
}
