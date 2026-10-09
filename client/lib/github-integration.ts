import { API_URL, apiFetch } from "@/lib/auth";

/** The user's GitHub stars connection — see server modules/integrations/github. */
export interface GithubConnection {
  connected: boolean;
  /** The GitHub username, without the @. */
  login: string | null;
  /** Repositories this connection has added to the library so far. */
  importedCount: number;
  /** Null until the first sync has finished. */
  lastSyncedAt: string | null;
  /** Why the last sync stopped short, in plain words. Null when it went fine. */
  lastError: string | null;
  /** GitHub revoked access: nothing syncs until the user connects again. */
  needsReconnect: boolean;
}

export interface GithubSyncResult {
  added: number;
  alreadySaved: number;
  leftOver: number;
}

export const GITHUB_CONNECTION_KEY = ["integrations", "github"] as const;

export function getGithubConnection(): Promise<GithubConnection> {
  return apiFetch<GithubConnection>("/integrations/github");
}

/** A page navigation, not a fetch: it goes to GitHub's consent screen and comes back to Integrations. */
export function getGithubConnectUrl(): string {
  return `${API_URL}/integrations/github/connect`;
}

export function syncGithubStars(): Promise<GithubSyncResult> {
  return apiFetch<GithubSyncResult>("/integrations/github/sync", { method: "POST" });
}

export async function disconnectGithub(): Promise<void> {
  await apiFetch("/integrations/github", { method: "DELETE" });
}
