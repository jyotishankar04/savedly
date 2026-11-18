import { API_URL, apiFetch } from "@/lib/auth";

/** The user's Reddit saved posts and comments connection — see server modules/integrations/reddit. */
export interface RedditConnection {
  connected: boolean;
  /** The Reddit username, without u/. */
  username: string | null;
  /** Posts and comments this connection has added to the library so far. */
  importedCount: number;
  /** Null until the first sync has finished. */
  lastSyncedAt: string | null;
  /** Why the last sync stopped short, in plain words. Null when it went fine. */
  lastError: string | null;
  /** Reddit revoked access: nothing syncs until the user connects again. */
  needsReconnect: boolean;
}

export interface RedditSyncResult {
  added: number;
  alreadySaved: number;
  leftOver: number;
}

export const REDDIT_CONNECTION_KEY = ["integrations", "reddit"] as const;

export function getRedditConnection(): Promise<RedditConnection> {
  return apiFetch<RedditConnection>("/integrations/reddit");
}

/** A page navigation, not a fetch: it goes to Reddit's consent screen and comes back to Integrations. */
export function getRedditConnectUrl(): string {
  return `${API_URL}/integrations/reddit/connect`;
}

export function syncRedditSaved(): Promise<RedditSyncResult> {
  return apiFetch<RedditSyncResult>("/integrations/reddit/sync", { method: "POST" });
}

export async function disconnectReddit(): Promise<void> {
  await apiFetch("/integrations/reddit", { method: "DELETE" });
}
