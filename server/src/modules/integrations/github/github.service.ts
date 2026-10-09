import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { githubConnections, memories } from "../../../db/schema";
import { MemoryType, PlanLimitType } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { decryptToken, encryptToken } from "../../../shared/crypto/token-cipher";
import { bumpUserCache } from "../../../shared/cache/response-cache";
import { logger } from "../../../shared/utils/logger";
import { enqueueIngestionBulk } from "../../ai/ingestion/queue";
import { normalizeUrl } from "../../memory/normalize-url";
import { remainingWithinLimit } from "../../plans/plans.service";
import { GithubAuthError, STARS_PAGE_SIZE, getGithubViewer, listStarredRepos, revokeGithubToken, type StarredRepo } from "./github-client";

// GitHub stars: a connected GitHub account whose starred repositories are
// added to the library as ordinary saved links, so each one is read,
// summarized and made searchable like anything else. The first sync brings
// in the most recent stars; later ones only what was starred since.

/** The first sync stops here. Someone with thousands of stars gets their most recent ones, not a flooded library. */
export const FIRST_SYNC_MAX = 500;

/** How long someone must wait before pressing "Sync now" again. */
const MANUAL_SYNC_COOLDOWN_MS = 60 * 1000;

const REVOKED_MESSAGE = "GitHub no longer accepts this connection. Connect again to keep adding your stars.";

export interface GithubConnectionView {
  connected: boolean;
  login: string | null;
  importedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  needsReconnect: boolean;
}

const NOT_CONNECTED: GithubConnectionView = { connected: false, login: null, importedCount: 0, lastSyncedAt: null, lastError: null, needsReconnect: false };

async function findConnection(userId: string) {
  const [row] = await db.select().from(githubConnections).where(eq(githubConnections.userId, userId)).limit(1);
  return row ?? null;
}

export async function getGithubConnection(userId: string): Promise<GithubConnectionView> {
  const row = await findConnection(userId);
  if (!row) return NOT_CONNECTED;
  return {
    connected: true,
    login: row.login,
    importedCount: row.importedCount,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    lastError: row.lastError,
    needsReconnect: row.needsReconnect,
  };
}

/** Saves (or replaces) the user's GitHub connection after they approve it on GitHub. */
export async function connectGithub(userId: string, token: { accessToken: string; scope: string }): Promise<void> {
  const viewer = await getGithubViewer(token.accessToken);
  const values = {
    githubUserId: viewer.id,
    login: viewer.login,
    encryptedAccessToken: encryptToken(token.accessToken),
    scope: token.scope,
    needsReconnect: false,
    lastError: null,
  };
  const existing = await findConnection(userId);
  // Connecting a different GitHub account starts over; reconnecting the same one carries on where it left off.
  const sameAccount = existing?.githubUserId === viewer.id;
  await db
    .insert(githubConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: githubConnections.userId,
      set: sameAccount ? values : { ...values, lastStarredAt: null, lastSyncedAt: null, importedCount: 0 },
    });
}

export async function disconnectGithub(userId: string): Promise<void> {
  const row = await findConnection(userId);
  if (!row) return;
  await db.delete(githubConnections).where(eq(githubConnections.userId, userId));
  // What was already added stays in the library: it belongs to the user now.
  void revokeGithubToken(decryptToken(row.encryptedAccessToken));
}

/** The stars made since `since`, oldest first. On a first sync (`since` null), the most recent FIRST_SYNC_MAX. */
async function fetchNewStars(token: string, since: Date | null): Promise<StarredRepo[]> {
  const found: StarredRepo[] = [];
  const maxPages = since ? 50 : FIRST_SYNC_MAX / STARS_PAGE_SIZE;
  for (let page = 1; page <= maxPages; page++) {
    const { repos, isLastPage } = await listStarredRepos(token, page);
    let reachedOld = false;
    for (const repo of repos) {
      if (since && new Date(repo.starredAt) <= since) {
        reachedOld = true;
        break;
      }
      found.push(repo);
    }
    if (reachedOld || isLastPage) break;
  }
  return found.reverse();
}

function describe(repo: StarredRepo): string | null {
  const facts = [repo.language, ...repo.topics.slice(0, 6)].filter(Boolean).join(" · ");
  return [repo.description, facts].filter(Boolean).join("\n\n") || null;
}

export interface GithubSyncResult {
  added: number;
  alreadySaved: number;
  /** Stars that didn't fit in the plan's library; they are tried again on the next sync. */
  leftOver: number;
}

/**
 * Adds the stars made since the last sync. Never throws for an expected
 * problem (revoked access, a full library): it records the reason on the
 * connection, where the Integrations page shows it.
 */
export async function syncGithubStars(userId: string): Promise<GithubSyncResult> {
  const connection = await findConnection(userId);
  if (!connection) throw new AppError("GitHub isn't connected", 404, "GITHUB_NOT_CONNECTED");
  if (connection.needsReconnect) return { added: 0, alreadySaved: 0, leftOver: 0 };

  let stars: StarredRepo[];
  try {
    stars = await fetchNewStars(decryptToken(connection.encryptedAccessToken), connection.lastStarredAt);
  } catch (err) {
    if (err instanceof GithubAuthError) {
      await db.update(githubConnections).set({ needsReconnect: true, lastError: REVOKED_MESSAGE }).where(eq(githubConnections.userId, userId));
      await bumpUserCache(userId);
      return { added: 0, alreadySaved: 0, leftOver: 0 };
    }
    throw err;
  }

  const existing = await db
    .select({ normalizedUrl: memories.normalizedUrl })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)));
  const saved = new Set(existing.map((row) => row.normalizedUrl).filter((v): v is string => Boolean(v)));

  // Oldest first, so that if the library fills up, the stars left over are
  // the newest ones and the cursor can stop just before them.
  let room = await remainingWithinLimit(userId, PlanLimitType.MEMORY_COUNT);
  const toAdd: StarredRepo[] = [];
  let alreadySaved = 0;
  let cursor = connection.lastStarredAt;
  let leftOver = 0;
  for (let i = 0; i < stars.length; i++) {
    const repo = stars[i];
    const key = normalizeUrl(repo.url);
    if (!key || saved.has(key)) {
      alreadySaved++;
    } else if (room === null || room > 0) {
      toAdd.push(repo);
      saved.add(key);
      if (room !== null) room--;
    } else {
      leftOver = stars.length - i;
      break;
    }
    cursor = new Date(repo.starredAt);
  }

  const created = toAdd.length
    ? await db
        .insert(memories)
        .values(
          toAdd.map((repo) => ({
            userId,
            type: MemoryType.WEB,
            title: repo.fullName,
            url: repo.url,
            normalizedUrl: normalizeUrl(repo.url),
            description: describe(repo),
            captureMethod: "github",
          })),
        )
        .returning({ id: memories.id })
    : [];

  await db
    .update(githubConnections)
    .set({
      lastStarredAt: cursor,
      lastSyncedAt: new Date(),
      importedCount: sql`${githubConnections.importedCount} + ${created.length}`,
      lastError: leftOver > 0 ? `Your library is full, so ${leftOver} starred ${leftOver === 1 ? "repository wasn't" : "repositories weren't"} added. Make room or upgrade, then sync again.` : null,
    })
    .where(eq(githubConnections.userId, userId));

  await enqueueIngestionBulk(created.map((memory) => memory.id));
  await bumpUserCache(userId);
  return { added: created.length, alreadySaved, leftOver };
}

/** "Sync now" from the Integrations page. */
export async function syncGithubStarsNow(userId: string): Promise<GithubSyncResult> {
  const connection = await findConnection(userId);
  if (!connection) throw new AppError("GitHub isn't connected", 404, "GITHUB_NOT_CONNECTED");
  if (connection.needsReconnect) throw new AppError(REVOKED_MESSAGE, 409, "GITHUB_NEEDS_RECONNECT");
  if (connection.lastSyncedAt && Date.now() - connection.lastSyncedAt.getTime() < MANUAL_SYNC_COOLDOWN_MS) {
    throw new AppError("That was just synced. Try again in a minute.", 429, "GITHUB_SYNC_TOO_SOON");
  }
  return syncGithubStars(userId);
}

/** The scheduled pass over every working connection. One account failing never stops the rest. */
export async function syncAllGithubConnections(): Promise<{ accounts: number; added: number }> {
  const rows = await db.select({ userId: githubConnections.userId }).from(githubConnections).where(eq(githubConnections.needsReconnect, false));
  let added = 0;
  for (const { userId } of rows) {
    try {
      added += (await syncGithubStars(userId)).added;
    } catch (err) {
      logger.warn({ err, userId }, "[github-stars] sync failed for one account");
    }
  }
  return { accounts: rows.length, added };
}
