import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { memories, redditConnections } from "../../../db/schema";
import { MemoryType, PlanLimitType } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { decryptToken, encryptToken } from "../../../shared/crypto/token-cipher";
import { bumpUserCache } from "../../../shared/cache/response-cache";
import { logger } from "../../../shared/utils/logger";
import { enqueueIngestionBulk } from "../../ai/api";
import { normalizeUrl } from "../../memory/api";
import { remainingWithinLimit } from "../../plans/api";
import {
  RedditAuthError,
  REDDIT_PAGE_SIZE,
  getRedditViewer,
  listRedditSaved,
  refreshRedditToken,
  type RedditSavedItem,
  type RedditTokenResponse,
} from "./reddit-client";

export const FIRST_SYNC_MAX = 500;
const MANUAL_SYNC_COOLDOWN_MS = 60 * 1000;
const REVOKED_MESSAGE = "Reddit no longer accepts this connection. Connect again to keep adding your saved items.";

export interface RedditConnectionView {
  connected: boolean;
  username: string | null;
  importedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  needsReconnect: boolean;
}

const NOT_CONNECTED: RedditConnectionView = {
  connected: false,
  username: null,
  importedCount: 0,
  lastSyncedAt: null,
  lastError: null,
  needsReconnect: false,
};

async function findConnection(userId: string) {
  const [row] = await db.select().from(redditConnections).where(eq(redditConnections.userId, userId)).limit(1);
  return row ?? null;
}

export async function getRedditConnection(userId: string): Promise<RedditConnectionView> {
  const row = await findConnection(userId);
  if (!row) return NOT_CONNECTED;
  return {
    connected: true,
    username: row.redditUsername,
    importedCount: row.importedCount,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    lastError: row.lastError,
    needsReconnect: row.needsReconnect,
  };
}

export async function connectReddit(userId: string, token: RedditTokenResponse): Promise<void> {
  const viewer = await getRedditViewer(token.accessToken);
  const values = {
    redditUsername: viewer.username,
    encryptedAccessToken: encryptToken(token.accessToken),
    encryptedRefreshToken: token.refreshToken ? encryptToken(token.refreshToken) : null,
    accessTokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000),
    scope: token.scope,
    needsReconnect: false,
    lastError: null,
  };

  const existing = await findConnection(userId);
  const sameAccount = existing?.redditUsername.toLowerCase() === viewer.username.toLowerCase();

  await db
    .insert(redditConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: redditConnections.userId,
      set: sameAccount
        ? values
        : {
            ...values,
            lastSavedAt: null,
            lastItemFullname: null,
            lastSyncedAt: null,
            importedCount: 0,
          },
    });
}

export async function disconnectReddit(userId: string): Promise<void> {
  const row = await findConnection(userId);
  if (!row) return;
  await db.delete(redditConnections).where(eq(redditConnections.userId, userId));
  await bumpUserCache(userId);
}

/** Obtains an active access token, refreshing it if within 2 minutes of expiration. */
async function getValidAccessToken(
  userId: string,
  connection: typeof redditConnections.$inferSelect,
): Promise<string> {
  const isExpiringSoon = connection.accessTokenExpiresAt.getTime() - Date.now() < 2 * 60 * 1000;
  if (!isExpiringSoon) {
    return decryptToken(connection.encryptedAccessToken);
  }

  if (!connection.encryptedRefreshToken) {
    return decryptToken(connection.encryptedAccessToken);
  }

  const rawRefreshToken = decryptToken(connection.encryptedRefreshToken);
  const refreshed = await refreshRedditToken(rawRefreshToken);

  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  await db
    .update(redditConnections)
    .set({
      encryptedAccessToken: encryptToken(refreshed.accessToken),
      accessTokenExpiresAt: newExpiresAt,
      needsReconnect: false,
      lastError: null,
    })
    .where(eq(redditConnections.userId, userId));

  return refreshed.accessToken;
}

/** Fetches saved items from Reddit, newest first, stopping when reaching lastItemFullname or lastSavedAt. */
async function fetchSavedItems(
  accessToken: string,
  username: string,
  lastItemFullname: string | null,
  lastSavedAt: Date | null,
): Promise<RedditSavedItem[]> {
  const found: RedditSavedItem[] = [];
  const maxPages = lastItemFullname || lastSavedAt ? 50 : Math.ceil(FIRST_SYNC_MAX / REDDIT_PAGE_SIZE);
  let cursor: string | null = null;
  const cutoffSeconds = lastSavedAt ? Math.floor(lastSavedAt.getTime() / 1000) : null;

  for (let page = 1; page <= maxPages; page++) {
    const { items, nextCursor } = await listRedditSaved(accessToken, username, cursor);
    if (items.length === 0) break;

    let reachedOld = false;
    for (const item of items) {
      if (lastItemFullname && item.fullname === lastItemFullname) {
        reachedOld = true;
        break;
      }
      if (cutoffSeconds && item.createdUtc <= cutoffSeconds) {
        reachedOld = true;
        break;
      }
      found.push(item);
    }

    if (reachedOld || !nextCursor) break;
    cursor = nextCursor;
  }

  // Reverse so oldest items are first: if a plan limit is reached, newer items are left for the next sync.
  return found.reverse();
}

export interface RedditSyncResult {
  added: number;
  alreadySaved: number;
  leftOver: number;
}

export async function syncRedditSaved(userId: string): Promise<RedditSyncResult> {
  const connection = await findConnection(userId);
  if (!connection) throw new AppError("Reddit isn't connected", 404, "REDDIT_NOT_CONNECTED");
  if (connection.needsReconnect) return { added: 0, alreadySaved: 0, leftOver: 0 };

  let items: RedditSavedItem[];
  try {
    const accessToken = await getValidAccessToken(userId, connection);
    items = await fetchSavedItems(accessToken, connection.redditUsername, connection.lastItemFullname, connection.lastSavedAt);
  } catch (err) {
    if (err instanceof RedditAuthError) {
      await db
        .update(redditConnections)
        .set({ needsReconnect: true, lastError: REVOKED_MESSAGE })
        .where(eq(redditConnections.userId, userId));
      await bumpUserCache(userId);
      return { added: 0, alreadySaved: 0, leftOver: 0 };
    }
    throw err;
  }

  if (items.length === 0) {
    await db
      .update(redditConnections)
      .set({ lastSyncedAt: new Date(), lastError: null })
      .where(eq(redditConnections.userId, userId));
    await bumpUserCache(userId);
    return { added: 0, alreadySaved: 0, leftOver: 0 };
  }

  // Deduplication: look up all user's existing normalizedUrls
  const existingRows = await db
    .select({ normalizedUrl: memories.normalizedUrl })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false)));
  const saved = new Set(existingRows.map((r) => r.normalizedUrl).filter((v): v is string => Boolean(v)));

  let room = await remainingWithinLimit(userId, PlanLimitType.MEMORY_COUNT);
  const toAdd: RedditSavedItem[] = [];
  let alreadySaved = 0;
  let leftOver = 0;

  // Track newest item processed to update the cursor
  let newestFullname = connection.lastItemFullname;
  let newestSavedAt = connection.lastSavedAt;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = normalizeUrl(item.url);
    if (!key || saved.has(key)) {
      alreadySaved++;
    } else if (room === null || room > 0) {
      toAdd.push(item);
      saved.add(key);
      if (room !== null) room--;
    } else {
      leftOver = items.length - i;
      break;
    }

    const itemDate = new Date(item.createdUtc * 1000);
    if (!newestSavedAt || itemDate > newestSavedAt) {
      newestSavedAt = itemDate;
      newestFullname = item.fullname;
    }
  }

  const created = toAdd.length
    ? await db
        .insert(memories)
        .values(
          toAdd.map((item) => {
            const subredditDesc = item.subreddit ? `r/${item.subreddit}` : null;
            const authorDesc = item.author ? `by u/${item.author}` : null;
            const scoreDesc = typeof item.score === "number" ? `${item.score} points` : null;
            const description = [subredditDesc, authorDesc, scoreDesc].filter(Boolean).join(" · ");
            const keywords = [item.subreddit, "reddit"].filter(Boolean) as string[];

            return {
              userId,
              type: MemoryType.WEB,
              title: item.title,
              url: item.url,
              normalizedUrl: normalizeUrl(item.url),
              content: item.content,
              description: description || null,
              keywords: keywords.length > 0 ? keywords : null,
              captureMethod: "reddit",
              socialPost: {
                platform: "reddit",
                kind: item.kind,
                fullname: item.fullname,
                author: item.author,
                subreddit: item.subreddit,
                score: item.score,
                permalink: item.permalink,
                createdUtc: item.createdUtc,
              },
            };
          }),
        )
        .returning({ id: memories.id })
    : [];

  await db
    .update(redditConnections)
    .set({
      lastItemFullname: newestFullname,
      lastSavedAt: newestSavedAt,
      lastSyncedAt: new Date(),
      importedCount: sql`${redditConnections.importedCount} + ${created.length}`,
      lastError:
        leftOver > 0
          ? `Your library is full, so ${leftOver} saved ${leftOver === 1 ? "item wasn't" : "items weren't"} added. Make room or upgrade, then sync again.`
          : null,
    })
    .where(eq(redditConnections.userId, userId));

  if (created.length > 0) {
    await enqueueIngestionBulk(created.map((m) => m.id));
  }
  await bumpUserCache(userId);

  return { added: created.length, alreadySaved, leftOver };
}

export async function syncRedditSavedNow(userId: string): Promise<RedditSyncResult> {
  const connection = await findConnection(userId);
  if (!connection) throw new AppError("Reddit isn't connected", 404, "REDDIT_NOT_CONNECTED");
  if (connection.needsReconnect) throw new AppError(REVOKED_MESSAGE, 409, "REDDIT_NEEDS_RECONNECT");
  if (connection.lastSyncedAt && Date.now() - connection.lastSyncedAt.getTime() < MANUAL_SYNC_COOLDOWN_MS) {
    throw new AppError("That was just synced. Try again in a minute.", 429, "REDDIT_SYNC_TOO_SOON");
  }
  return syncRedditSaved(userId);
}

export async function syncAllRedditConnections(): Promise<{ accounts: number; added: number }> {
  const rows = await db
    .select({ userId: redditConnections.userId })
    .from(redditConnections)
    .where(eq(redditConnections.needsReconnect, false));

  let added = 0;
  for (const { userId } of rows) {
    try {
      added += (await syncRedditSaved(userId)).added;
    } catch (err) {
      logger.warn({ err, userId }, "[reddit-saved] sync failed for one account");
    }
  }
  return { accounts: rows.length, added };
}
