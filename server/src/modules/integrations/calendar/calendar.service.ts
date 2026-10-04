import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "../../../db";
import { calendarConnections, calendarEventLinks, memories } from "../../../db/schema";
import { CalendarProvider } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/utils/logger";
import { decryptToken, encryptToken } from "../../../shared/crypto/token-cipher";
import { createMemory, getMemoryById, updateMemory } from "../../memory/memory.service";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleAccountEmail,
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
  updateGoogleCalendarEvent,
} from "./google-calendar-client";
import type { CalendarEventPayload, CalendarTokenExchange } from "./calendar.types";

// One provider today. The key stays a type (and the functions below stay
// keyed by it) so a second calendar can be added without reshaping callers.
export type CalendarProviderKey = "google";

// A token is refreshed once it's within this window of expiring, rather
// than waiting for it to actually fail — avoids a request racing an
// about-to-expire token.
const REFRESH_SKEW_MS = 5 * 60 * 1000;

async function isProviderConfigured(_provider: CalendarProviderKey): Promise<boolean> {
  return isGoogleCalendarConfigured();
}

function toEnumValue(_provider: CalendarProviderKey): CalendarProvider {
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

export interface PushableMemory {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  eventAt: Date;
  /** Defaults to eventAt + 1h when omitted. */
  endAt?: Date;
}

export async function pushMemoryToCalendar(
  userId: string,
  provider: CalendarProviderKey,
  memory: PushableMemory,
): Promise<{ htmlLink: string }> {
  if (!(await isProviderConfigured(provider))) {
    throw new AppError("Google Calendar isn't configured yet", 503, "CALENDAR_NOT_CONFIGURED");
  }

  const accessToken = await getValidAccessToken(userId, provider);
  if (!accessToken) {
    throw new AppError("Calendar isn't connected", 404, "CALENDAR_NOT_CONNECTED");
  }

  const startIso = memory.eventAt.toISOString();
  const endIso = (memory.endAt ?? new Date(memory.eventAt.getTime() + 60 * 60 * 1000)).toISOString();
  const payload: CalendarEventPayload = { title: memory.title, description: memory.description, url: memory.url, startIso, endIso };

  const created = await createGoogleCalendarEvent(accessToken, payload);

  await db
    .insert(calendarEventLinks)
    .values({
      memoryId: memory.id,
      userId,
      provider: toEnumValue(provider),
      externalEventId: created.id,
      externalHtmlLink: created.htmlLink,
    })
    .onConflictDoUpdate({
      target: [calendarEventLinks.memoryId, calendarEventLinks.provider],
      set: { externalEventId: created.id, externalHtmlLink: created.htmlLink },
    });

  return { htmlLink: created.htmlLink };
}

/** Where a memory's event lives on each connected calendar, to open it there. */
export async function eventLinksForMemory(
  userId: string,
  memoryId: string,
): Promise<{ provider: CalendarProviderKey; htmlLink: string }[]> {
  const rows = await db
    .select({ provider: calendarEventLinks.provider, htmlLink: calendarEventLinks.externalHtmlLink })
    .from(calendarEventLinks)
    .where(and(eq(calendarEventLinks.memoryId, memoryId), eq(calendarEventLinks.userId, userId), eq(calendarEventLinks.provider, CalendarProvider.GOOGLE)));
  return rows.flatMap((row) =>
    row.htmlLink ? [{ provider: "google" as CalendarProviderKey, htmlLink: row.htmlLink }] : [],
  );
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

export interface MergedCalendarEvent {
  id: string;
  /** "memora" for an event that only exists as a memory's eventAt (no connected provider, or not yet pushed); otherwise which provider it was fetched from. */
  source: "memora" | CalendarProviderKey;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  /** Provider's own UI link, or null for a memora-only event. */
  htmlLink: string | null;
  /** The Memora memory backing this event, when there is one — lets the client link through to it either way. */
  memoryId: string | null;
  /** The provider's own event id, for a provider-sourced event with no memoryId — needed to edit/delete it directly since there's no memory to key off. Null for a memora-only event. */
  externalEventId: string | null;
  /** A whole-day event: startAt/endAt are midnight UTC of its dates (end exclusive). */
  allDay: boolean;
}

/**
 * Merges three sources into one calendar view: each connected provider's
 * real events, plus every Memora memory with an eventAt in range that
 * ISN'T already represented by one of those provider events (tracked via
 * calendar_event_links) — so a memory with a date but no calendar
 * connection still shows up, without duplicating ones that do.
 */
export async function listEvents(userId: string, range: { from: Date; to: Date }): Promise<MergedCalendarEvent[]> {
  const connections = await getConnections(userId);

  const providerEventArrays = await Promise.all(
    connections.map(async ({ provider }): Promise<MergedCalendarEvent[]> => {
      try {
        const accessToken = await getValidAccessToken(userId, provider);
        if (!accessToken) return [];
        const raw = await listGoogleCalendarEvents(accessToken, { timeMinIso: range.from.toISOString(), timeMaxIso: range.to.toISOString() });
        return raw.map((event) => ({
          id: `${provider}:${event.externalEventId}`,
          source: provider,
          title: event.title,
          description: event.description,
          startAt: event.startAt,
          endAt: event.endAt,
          htmlLink: event.htmlLink,
          memoryId: null, // filled in below once calendar_event_links is loaded
          externalEventId: event.externalEventId,
          allDay: event.allDay,
        }));
      } catch (err) {
        // One provider having a bad day (expired grant, transient 5xx)
        // shouldn't blank out the whole calendar view.
        logger.warn({ err, provider }, "[calendar] listEvents provider fetch failed");
        return [];
      }
    }),
  );
  const providerEvents = providerEventArrays.flat();

  const linkedRows =
    connections.length > 0
      ? await db
          .select({ memoryId: calendarEventLinks.memoryId, provider: calendarEventLinks.provider, externalEventId: calendarEventLinks.externalEventId })
          .from(calendarEventLinks)
          .where(and(eq(calendarEventLinks.userId, userId), inArray(calendarEventLinks.provider, connections.map((c) => toEnumValue(c.provider)))))
      : [];
  const memoryIdByExternalId = new Map(linkedRows.map((row) => [`${row.provider}:${row.externalEventId}`, row.memoryId]));
  const linkedMemoryIds = new Set(linkedRows.map((row) => row.memoryId));

  for (const event of providerEvents) {
    event.memoryId = memoryIdByExternalId.get(event.id) ?? null;
  }

  const memoraRows = await db
    .select({ id: memories.id, title: memories.title, description: memories.description, eventAt: memories.eventAt, eventDurationMinutes: memories.eventDurationMinutes })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.inTrash, false),
        isNotNull(memories.eventAt),
        gte(memories.eventAt, range.from),
        lt(memories.eventAt, range.to),
      ),
    );

  const memoraEvents: MergedCalendarEvent[] = memoraRows
    .filter((row) => !linkedMemoryIds.has(row.id))
    .map((row) => ({
      id: `memora:${row.id}`,
      source: "memora",
      title: row.title,
      description: row.description,
      startAt: row.eventAt!.toISOString(),
      endAt: new Date(row.eventAt!.getTime() + (row.eventDurationMinutes ?? 60) * 60 * 1000).toISOString(),
      htmlLink: null,
      memoryId: row.id,
      externalEventId: null,
      allDay: false,
    }));

  return [...providerEvents, ...memoraEvents].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Stores how long a note's event runs; null falls back to 1 hour. */
async function setEventDuration(userId: string, memoryId: string, minutes: number | null): Promise<void> {
  await db
    .update(memories)
    .set({ eventDurationMinutes: minutes })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));
}

export interface CreateStandaloneEventInput {
  title: string;
  description?: string | null;
  /** ISO 8601. */
  startAt: string;
  /** Defaults to 60. */
  durationMinutes?: number;
}

export interface CreateStandaloneEventResult {
  memoryId: string;
  title: string;
  startAt: string;
  endAt: string;
  pushedTo: CalendarProviderKey[];
  notConnected: CalendarProviderKey[];
  /** The event on each calendar it was pushed to, to open it there. */
  links: { provider: CalendarProviderKey; htmlLink: string }[];
}

/**
 * The single path both the "New event" dialog (POST /integrations/calendar/events)
 * and the create_calendar_event agent tool go through — creates a real
 * Memora memory (so the event is searchable/visible like everything else
 * saved) with its eventAt already confirmed, then best-effort pushes it to
 * every connected provider. A provider push failing for one doesn't fail
 * the others or the memory creation — the event still exists in Memora
 * either way, just not yet synced to that provider's calendar.
 */
export async function createStandaloneCalendarEvent(
  userId: string,
  input: CreateStandaloneEventInput,
): Promise<CreateStandaloneEventResult> {
  const created = await createMemory(userId, {
    type: "note",
    title: input.title,
    content: input.description ?? input.title,
    description: input.description ?? undefined,
    captureMethod: "server",
  });
  await updateMemory(userId, created.id, { eventAt: input.startAt });
  await setEventDuration(userId, created.id, input.durationMinutes ?? null);

  const durationMs = (input.durationMinutes ?? 60) * 60 * 1000;
  const startDate = new Date(input.startAt);
  const endDate = new Date(startDate.getTime() + durationMs);

  const connections = await getConnections(userId);
  const pushedTo: CalendarProviderKey[] = [];
  const notConnected: CalendarProviderKey[] = [];
  const links: CreateStandaloneEventResult["links"] = [];

  for (const provider of ["google"] as const) {
    if (!connections.some((c) => c.provider === provider)) {
      notConnected.push(provider);
      continue;
    }
    try {
      const { htmlLink } = await pushMemoryToCalendar(userId, provider, {
        id: created.id,
        title: input.title,
        description: input.description ?? null,
        url: null,
        eventAt: startDate,
        endAt: endDate,
      });
      pushedTo.push(provider);
      if (htmlLink) links.push({ provider, htmlLink });
    } catch (err) {
      logger.warn({ err, provider, memoryId: created.id }, "[calendar] createStandaloneCalendarEvent push failed");
      notConnected.push(provider);
    }
  }

  return {
    memoryId: created.id,
    title: input.title,
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    pushedTo,
    notConnected,
    links,
  };
}

async function callProviderUpdate(
  provider: CalendarProviderKey,
  accessToken: string,
  externalEventId: string,
  payload: CalendarEventPayload,
): Promise<{ htmlLink: string }> {
  return updateGoogleCalendarEvent(accessToken, externalEventId, payload);
}

async function callProviderDelete(provider: CalendarProviderKey, accessToken: string, externalEventId: string): Promise<void> {
  return deleteGoogleCalendarEvent(accessToken, externalEventId);
}

export interface UpdateStandaloneEventInput {
  title?: string;
  description?: string | null;
  /** ISO 8601. */
  startAt?: string;
  /** Only applied when provided — otherwise the event's existing duration is preserved. */
  durationMinutes?: number;
}

/**
 * Edits an event that has a Memora memory behind it — the overwhelming
 * majority of events in this app, since almost everything reaches the
 * calendar by being created here first (New event dialog, the agent tool,
 * or AI detection). Updates the memory itself, then best-effort re-syncs
 * every provider it's already been pushed to (calendar_event_links) so the
 * external copy doesn't silently drift out of date. Mirrors
 * createStandaloneCalendarEvent's "memory is the source of truth, provider
 * sync is best-effort" shape.
 */
export async function updateEventForMemory(userId: string, memoryId: string, input: UpdateStandaloneEventInput): Promise<void> {
  const memory = await getMemoryById(userId, memoryId);

  const patch: { title?: string; description?: string; eventAt?: string } = {};
  if (input.title !== undefined) patch.title = input.title;
  // updateMemorySchema's description has no null-to-clear convention
  // (unlike eventAt) — an explicit null here just means "no description",
  // which an empty string represents just as well.
  if (input.description !== undefined) patch.description = input.description ?? "";
  if (input.startAt !== undefined) patch.eventAt = input.startAt;
  if (Object.keys(patch).length > 0) await updateMemory(userId, memoryId, patch);
  if (input.durationMinutes !== undefined) await setEventDuration(userId, memoryId, input.durationMinutes);

  const links = await db.select().from(calendarEventLinks).where(and(eq(calendarEventLinks.memoryId, memoryId), eq(calendarEventLinks.userId, userId)));
  if (links.length === 0) return;

  const title = input.title ?? memory.title;
  const description = input.description !== undefined ? input.description : memory.description;
  const startDate = input.startAt ? new Date(input.startAt) : memory.eventAt;
  if (!startDate) return; // nothing to sync if the memory has no date at all

  // An edit that doesn't change the length keeps the stored one (1 hour when none was ever set).
  const durationMs = (input.durationMinutes ?? memory.eventDurationMinutes ?? 60) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  for (const link of links) {
    const provider = link.provider as CalendarProviderKey;
    try {
      const accessToken = await getValidAccessToken(userId, provider);
      if (!accessToken) continue;
      const payload: CalendarEventPayload = {
        title,
        description: description ?? null,
        url: memory.url,
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString(),
      };
      await callProviderUpdate(provider, accessToken, link.externalEventId, payload);
    } catch (err) {
      logger.warn({ err, provider, memoryId }, "[calendar] updateEventForMemory provider sync failed");
    }
  }
}

/**
 * Removes an event that has a Memora memory behind it — deletes any synced
 * copy on every connected provider first (best-effort; a provider being
 * unreachable shouldn't block removing it locally), then clears the
 * memory's eventAt. The memory itself is kept — this removes it from the
 * calendar, not the user's saved note, matching the existing "Remove
 * event" affordance elsewhere in the app.
 */
export async function deleteEventForMemory(userId: string, memoryId: string): Promise<void> {
  const links = await db.select().from(calendarEventLinks).where(and(eq(calendarEventLinks.memoryId, memoryId), eq(calendarEventLinks.userId, userId)));

  for (const link of links) {
    const provider = link.provider as CalendarProviderKey;
    try {
      const accessToken = await getValidAccessToken(userId, provider);
      if (accessToken) await callProviderDelete(provider, accessToken, link.externalEventId);
    } catch (err) {
      logger.warn({ err, provider, memoryId }, "[calendar] deleteEventForMemory provider delete failed");
    }
  }

  await db.delete(calendarEventLinks).where(and(eq(calendarEventLinks.memoryId, memoryId), eq(calendarEventLinks.userId, userId)));
  await updateMemory(userId, memoryId, { eventAt: null });
  await setEventDuration(userId, memoryId, null);
}

/**
 * Edits or removes a purely external event — one that lives only on a
 * connected Google calendar and was never created through Memora
 * (no memory, no calendar_event_links row). Rare in practice, but a
 * connected calendar can already have events on it before/aside from
 * anything Memora created, and this app should still let the user manage
 * those from the same calendar page rather than only the ones it created.
 */
export async function updateExternalCalendarEvent(
  userId: string,
  provider: CalendarProviderKey,
  externalEventId: string,
  input: { title: string; description: string | null; startAt: string; endAt: string },
): Promise<void> {
  if (!(await isProviderConfigured(provider))) {
    throw new AppError("Google Calendar isn't configured yet", 503, "CALENDAR_NOT_CONFIGURED");
  }
  const accessToken = await getValidAccessToken(userId, provider);
  if (!accessToken) throw new AppError("Calendar isn't connected", 404, "CALENDAR_NOT_CONNECTED");

  await callProviderUpdate(provider, accessToken, externalEventId, {
    title: input.title,
    description: input.description,
    url: null,
    startIso: input.startAt,
    endIso: input.endAt,
  });
}

export async function deleteExternalCalendarEvent(userId: string, provider: CalendarProviderKey, externalEventId: string): Promise<void> {
  if (!(await isProviderConfigured(provider))) {
    throw new AppError("Google Calendar isn't configured yet", 503, "CALENDAR_NOT_CONFIGURED");
  }
  const accessToken = await getValidAccessToken(userId, provider);
  if (!accessToken) throw new AppError("Calendar isn't connected", 404, "CALENDAR_NOT_CONNECTED");

  await callProviderDelete(provider, accessToken, externalEventId);
}
