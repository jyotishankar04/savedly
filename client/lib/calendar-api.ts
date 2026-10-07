import { apiFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type CalendarProviderKey = "google";

export interface CalendarConnectionSummary {
  provider: CalendarProviderKey;
  connectedAt: string;
  providerAccountEmail: string | null;
  expiresAt: string;
}

export const getCalendarConnections = () =>
  apiFetch<{ connections: CalendarConnectionSummary[] }>("/integrations/calendar/connections").then(
    (r) => r.connections,
  );

export const disconnectCalendar = (provider: CalendarProviderKey) =>
  apiFetch<{ disconnected: true }>(`/integrations/calendar/${provider}`, { method: "DELETE" });

export const pushMemoryToCalendar = (memoryId: string, provider: CalendarProviderKey) =>
  apiFetch<{ htmlLink: string }>(`/memories/${memoryId}/calendar-events`, {
    method: "POST",
    body: { provider },
  });

/**
 * Full-page redirect to the backend, which handles the OAuth round trip and
 * redirects back to /app/settings?calendar=connected|error. Tokens land in
 * calendar_connections against the already-authenticated user (identified
 * via the signed `state` param, not a cookie) — mirrors getProviderLoginUrl's
 * shape for this separate, calendar-write-scoped OAuth flow.
 */
export function getCalendarConnectUrl(provider: CalendarProviderKey): string {
  return `${API_URL}/integrations/calendar/${provider}/connect`;
}

export interface CalendarEvent {
  id: string;
  source: "savedly" | CalendarProviderKey;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  /** The provider's own UI link, or null for an event that only exists in Savedly. */
  htmlLink: string | null;
  /** The Savedly memory backing this event, when there is one. */
  memoryId: string | null;
  /** The provider's own event id, for a provider-sourced event with no memoryId — null for an event that only exists in Savedly. */
  externalEventId: string | null;
  /** A whole-day event: startAt/endAt are midnight UTC of its dates, end exclusive — use their YYYY-MM-DD part, not the instant. */
  allDay: boolean;
}

export const listCalendarEvents = (from: string, to: string) =>
  apiFetch<{ events: CalendarEvent[] }>(
    `/integrations/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  ).then((r) => r.events);

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  /** ISO 8601. */
  startAt: string;
  /** Defaults to 60 on the server. */
  durationMinutes?: number;
}

export interface CreateCalendarEventResult {
  memoryId: string;
  title: string;
  startAt: string;
  pushedTo: CalendarProviderKey[];
  notConnected: CalendarProviderKey[];
}

export const createCalendarEvent = (input: CreateCalendarEventInput) =>
  apiFetch<CreateCalendarEventResult>("/integrations/calendar/events", { method: "POST", body: input });

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string | null;
  /** ISO 8601. */
  startAt?: string;
  durationMinutes?: number;
}

/** For an event backed by a Savedly memory — updates the memory and re-syncs any calendar it's already been pushed to. */
export const updateCalendarEventForMemory = (memoryId: string, input: UpdateCalendarEventInput) =>
  apiFetch<{ updated: true }>(`/memories/${memoryId}/calendar-event`, { method: "PATCH", body: input });

/** Removes the event from the calendar (clears eventAt + deletes any synced copy) — the underlying memory itself is kept. */
export const deleteCalendarEventForMemory = (memoryId: string) =>
  apiFetch<{ deleted: true }>(`/memories/${memoryId}/calendar-event`, { method: "DELETE" });

/** For an event that lives only on a connected calendar with no Savedly memory behind it at all. */
export const updateExternalCalendarEvent = (
  provider: CalendarProviderKey,
  externalEventId: string,
  input: { title: string; description?: string | null; startAt: string; durationMinutes?: number },
) =>
  apiFetch<{ updated: true }>(`/integrations/calendar/events/${provider}/${encodeURIComponent(externalEventId)}`, {
    method: "PATCH",
    body: input,
  });

export const deleteExternalCalendarEvent = (provider: CalendarProviderKey, externalEventId: string) =>
  apiFetch<{ deleted: true }>(`/integrations/calendar/events/${provider}/${encodeURIComponent(externalEventId)}`, {
    method: "DELETE",
  });
