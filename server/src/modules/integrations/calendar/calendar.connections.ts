import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { calendarConnections } from "../../../db/schema";
import { CalendarProvider } from "../../../db/enums";
import { logger } from "../../../shared/utils/logger";
import { decryptToken, encryptToken } from "../../../shared/crypto/token-cipher";
import { getGoogleAccountEmail, isGoogleCalendarConfigured, refreshGoogleAccessToken } from "./google-calendar-client";
import type { CalendarTokenExchange } from "./calendar.types";
import { bumpUserCache } from "../../../shared/cache/response-cache";

// One provider today. The key stays a type (and the functions below stay
// keyed by it) so a second calendar can be added without reshaping callers.
export type CalendarProviderKey = "google";

// A token is refreshed once it's within this window of expiring, rather
// than waiting for it to actually fail — avoids a request racing an
// about-to-expire token.
const REFRESH_SKEW_MS = 5 * 60 * 1000;

export async function isProviderConfigured(_provider: CalendarProviderKey): Promise<boolean> {
  return isGoogleCalendarConfigured();
}

export function toEnumValue(_provider: CalendarProviderKey): CalendarProvider {
  return CalendarProvider.GOOGLE;
}

export interface CalendarConnectionSummary {
  provider: CalendarProviderKey;
  connectedAt: Date;
  providerAccountEmail: string | null;
  expiresAt: Date;
}

// Connections already tried for a missing account email this process, so a
// connection that can't tell us doesn't cost a Google call on every read.
const emailLookupTried = new Set<string>();

/** Fills in which account a connection belongs to, for ones saved without it. Best effort. */
async function backfillAccountEmail(userId: string, provider: CalendarProviderKey): Promise<string | null> {
  const key = `${userId}:${provider}`;
  if (emailLookupTried.has(key) || provider !== "google") return null;
  emailLookupTried.add(key);
  try {
    const accessToken = await getValidAccessToken(userId, provider);
    const email = accessToken ? await getGoogleAccountEmail(accessToken) : null;
    if (email) {
      await db
        .update(calendarConnections)
        .set({ providerAccountEmail: email })
        .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, toEnumValue(provider))));
    }
    return email;
  } catch (err) {
    logger.warn({ err, provider }, "[calendar] couldn't look up the connected account's email");
    return null;
  }
}

export async function getConnections(userId: string): Promise<CalendarConnectionSummary[]> {
  // Google only: a connection left over from a provider that has since been
  // removed is ignored rather than surfaced as something the app can use.
  const rows = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, CalendarProvider.GOOGLE)));
  return Promise.all(
    rows.map(async (row) => ({
      provider: row.provider as CalendarProviderKey,
      connectedAt: row.createdAt,
      providerAccountEmail: row.providerAccountEmail ?? (await backfillAccountEmail(userId, row.provider as CalendarProviderKey)),
      expiresAt: row.accessTokenExpiresAt,
    })),
  );
}

export async function connectCalendar(
  userId: string,
  provider: CalendarProviderKey,
  tokens: CalendarTokenExchange,
): Promise<void> {
  const values = {
    userId,
    provider: toEnumValue(provider),
    encryptedAccessToken: encryptToken(tokens.accessToken),
    encryptedRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
    scope: tokens.scope,
    providerAccountEmail: tokens.accountEmail,
  };

  await db
    .insert(calendarConnections)
    .values(values)
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.provider],
      set: {
        encryptedAccessToken: values.encryptedAccessToken,
        // A reconnect without a fresh refresh_token (e.g. a second
        // prompt=consent that Google still sometimes short-circuits) keeps
        // the existing one rather than nulling out a still-valid token.
        encryptedRefreshToken: values.encryptedRefreshToken ?? undefined,
        accessTokenExpiresAt: values.accessTokenExpiresAt,
        scope: values.scope,
        providerAccountEmail: values.providerAccountEmail,
      },
    });

  // The connection list is cached per user. This runs from the provider's
  // redirect, which carries no session, so the cache layer doesn't see it as
  // that user's write: without this, the page they land on would still say
  // "not connected" for up to a minute.
  await bumpUserCache(userId);
}

export async function disconnectCalendar(userId: string, provider: CalendarProviderKey): Promise<void> {
  await db
    .delete(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, toEnumValue(provider))));
}

export async function getValidAccessToken(userId: string, provider: CalendarProviderKey): Promise<string | null> {
  const [row] = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, toEnumValue(provider))))
    .limit(1);
  if (!row) return null;

  const expiresSoon = row.accessTokenExpiresAt.getTime() - Date.now() < REFRESH_SKEW_MS;
  if (!expiresSoon) return decryptToken(row.encryptedAccessToken);

  if (!row.encryptedRefreshToken) {
    // Expired with no refresh token on file — the stored access token is
    // useless; surface as "not connected" rather than returning a dead token.
    return null;
  }

  const refreshToken = decryptToken(row.encryptedRefreshToken);
  const refreshed = await refreshGoogleAccessToken(refreshToken);

  await db
    .update(calendarConnections)
    .set({
      encryptedAccessToken: encryptToken(refreshed.accessToken),
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
    })
    .where(eq(calendarConnections.id, row.id));

  return refreshed.accessToken;
}

export async function bestEffortRevoke(_provider: CalendarProviderKey, refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" });
  } catch (err) {
    // Local disconnect must succeed regardless — this is best-effort cleanup only.
    logger.warn({ err }, "[calendar] best-effort Google token revoke failed");
  }
}
