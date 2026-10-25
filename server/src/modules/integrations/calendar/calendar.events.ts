import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "../../../db";
import { calendarEventLinks, memories } from "../../../db/schema";
import { CalendarProvider } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/utils/logger";
import { createMemory, getMemoryById, updateMemory } from "../../memory/api";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, listGoogleCalendarEvents, updateGoogleCalendarEvent } from "./google-calendar-client";
import type { CalendarEventPayload } from "./calendar.types";
import { getConnections, getValidAccessToken, isProviderConfigured, toEnumValue, type CalendarProviderKey } from "./calendar.connections";

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

export interface MergedCalendarEvent {
  id: string;
  /** "savedly" for an event that exists only as a memory's eventAt; otherwise the provider it came from. */
  source: "savedly" | CalendarProviderKey;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  /** Provider's own UI link, or null for an event that only exists in Savedly. */
  htmlLink: string | null;
  /** The Savedly memory behind this event, when there is one, so the client can link to it. */
  memoryId: string | null;
  /**
   * The provider's event id for a provider-sourced event with no memoryId, needed to edit/delete it
   * directly. Null for Savedly-only events.
   */
  externalEventId: string | null;
  /** A whole-day event: startAt/endAt are midnight UTC of its dates (end exclusive). */
  allDay: boolean;
}

/**
 * Merges each connected provider's events with every memory that has an eventAt in range and isn't
 * already one of them (calendar_event_links), so dated memories show without duplicates.
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
        // One provider failing (expired grant, 5xx) shouldn't blank the whole calendar.
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

  const savedRows = await db
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

  const savedEvents: MergedCalendarEvent[] = savedRows
    .filter((row) => !linkedMemoryIds.has(row.id))
    .map((row) => ({
      id: `savedly:${row.id}`,
      source: "savedly",
      title: row.title,
      description: row.description,
      startAt: row.eventAt!.toISOString(),
      endAt: new Date(row.eventAt!.getTime() + (row.eventDurationMinutes ?? 60) * 60 * 1000).toISOString(),
      htmlLink: null,
      memoryId: row.id,
      externalEventId: null,
      allDay: false,
    }));

  return [...providerEvents, ...savedEvents].sort((a, b) => a.startAt.localeCompare(b.startAt));
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
 * The one path for the "New event" dialog and the create_calendar_event tool: creates a memory with
 * eventAt confirmed, then pushes to each provider best-effort; one provider failing doesn't fail
 * the others or the memory.
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
 * Edits an event with a memory behind it (nearly all): updates the memory, then best-effort
 * re-syncs each provider it was pushed to. The memory is the source of truth.
 */
export async function updateEventForMemory(userId: string, memoryId: string, input: UpdateStandaloneEventInput): Promise<void> {
  const memory = await getMemoryById(userId, memoryId);

  const patch: { title?: string; description?: string; eventAt?: string } = {};
  if (input.title !== undefined) patch.title = input.title;
  // updateMemorySchema's description has no null-to-clear convention (unlike eventAt), so null means "".
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
 * Removes an event with a memory: deletes synced provider copies first (best-effort), then clears
 * eventAt. The memory is kept.
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

/** Edits or removes an external event that lives only on a connected calendar (no memory or link row). */
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
