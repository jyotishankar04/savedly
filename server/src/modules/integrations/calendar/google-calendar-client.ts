import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/app-error";
import { isTokenCipherConfigured } from "../../../shared/crypto/token-cipher";
import { getOAuthCredentials, requireOAuthCredentials } from "../../auth/oauth-config";
import type {
  CalendarEventPayload,
  CalendarTokenExchange,
  CalendarTokenRefresh,
  CreatedCalendarEvent,
  RemoteCalendarEvent,
} from "./calendar.types";

// Plain fetch() throughout, no `googleapis` SDK — matches this codebase's
// existing GitHub-OAuth-via-fetch convention (auth.service.ts) and avoids a
// heavy dependency for the handful of REST calls this needs.
//
// Deliberately a SEPARATE OAuth flow from auth.service.ts's login-only
// buildGoogleAuthUrl/exchangeGoogleCode: those request scope
// "openid email profile" with no access_type, so Google never returns a
// refresh_token there. This module reuses the same GOOGLE_CLIENT_ID/SECRET
// (Google's incremental-authorization model allows requesting an
// additional scope in a separate consent flow against the same OAuth
// client — no new Google Cloud credentials needed, just enabling the
// Calendar API and approving the calendar.events scope in the GCP console)
// but with its own callback route and access_type=offline&prompt=consent,
// which is required to reliably get a refresh_token back.

const GOOGLE_CALENDAR_CALLBACK_URL = `${env.SERVER_URL}/api/v1/integrations/calendar/google/callback`;
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function isGoogleCalendarConfigured(): Promise<boolean> {
  return isTokenCipherConfigured() && !!(await getOAuthCredentials("google"));
}

export async function buildGoogleCalendarAuthUrl(state: string): Promise<string> {
  const { clientId } = await requireOAuthCredentials("google");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_CALENDAR_CALLBACK_URL,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    state,
    access_type: "offline",
    // Forces Google to return a refresh_token every time, unlike the login
    // flow's prompt=select_account — otherwise a repeat connection (e.g.
    // reconnecting after a revoke) may come back with no refresh_token at all.
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCalendarCode(code: string): Promise<CalendarTokenExchange> {
  const google = await requireOAuthCredentials("google");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: GOOGLE_CALENDAR_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new AppError("Failed to exchange Google Calendar authorization code", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const tokenBody = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  let accountEmail: string | null = null;
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (profileResponse.ok) {
    const profile = (await profileResponse.json()) as { email?: string };
    accountEmail = profile.email ?? null;
  }

  return {
    accessToken: tokenBody.access_token,
    refreshToken: tokenBody.refresh_token ?? null,
    expiresInSeconds: tokenBody.expires_in,
    scope: tokenBody.scope,
    accountEmail,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<CalendarTokenRefresh> {
  const google = await requireOAuthCredentials("google");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to refresh Google Calendar access token", 401, "CALENDAR_TOKEN_REFRESH_FAILED");
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload,
): Promise<CreatedCalendarEvent> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.title,
      description: [event.description, event.url].filter(Boolean).join("\n\n") || undefined,
      start: { dateTime: event.startIso },
      end: { dateTime: event.endIso },
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to create Google Calendar event", 502, "CALENDAR_EVENT_CREATE_FAILED");
  }

  const body = (await response.json()) as { id: string; htmlLink: string };
  return { id: body.id, htmlLink: body.htmlLink };
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventPayload,
): Promise<CreatedCalendarEvent> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.title,
      description: [event.description, event.url].filter(Boolean).join("\n\n") || undefined,
      start: { dateTime: event.startIso },
      end: { dateTime: event.endIso },
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to update Google Calendar event", 502, "CALENDAR_EVENT_UPDATE_FAILED");
  }

  const body = (await response.json()) as { id: string; htmlLink: string };
  return { id: body.id, htmlLink: body.htmlLink };
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 404/410 means it's already gone — deleting an already-deleted event
  // should behave the same as a successful delete, not an error.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new AppError("Failed to delete Google Calendar event", 502, "CALENDAR_EVENT_DELETE_FAILED");
  }
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  range: { timeMinIso: string; timeMaxIso: string },
): Promise<RemoteCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: range.timeMinIso,
    timeMax: range.timeMaxIso,
    // Expands recurring events into their individual occurrences within
    // the range, sorted — otherwise a weekly standup would come back as
    // one row with no way to tell which occurrence falls in this window.
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new AppError("Failed to list Google Calendar events", 502, "CALENDAR_LIST_FAILED");
  }

  const body = (await response.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      htmlLink: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
    }>;
  };

  // An all-day event has `date` (no time component) instead of `dateTime` —
  // normalized to midnight UTC so every event on the merged list has a
  // real startAt/endAt regardless of which shape Google returned.
  return (body.items ?? []).map((item) => ({
    externalEventId: item.id,
    title: item.summary ?? "(No title)",
    description: item.description ?? null,
    htmlLink: item.htmlLink,
    startAt: item.start.dateTime ?? `${item.start.date}T00:00:00.000Z`,
    endAt: item.end.dateTime ?? `${item.end.date}T00:00:00.000Z`,
  }));
}
