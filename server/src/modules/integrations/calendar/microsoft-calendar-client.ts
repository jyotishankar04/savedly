import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/app-error";
import { isTokenCipherConfigured } from "../../../shared/crypto/token-cipher";
import type {
  CalendarEventPayload,
  CalendarTokenExchange,
  CalendarTokenRefresh,
  CreatedCalendarEvent,
  RemoteCalendarEvent,
} from "./calendar.types";

// File-for-file mirror of google-calendar-client.ts, swapping endpoints/env
// vars for Microsoft Entra ID (Azure AD) + Microsoft Graph. Needs an
// entirely new Azure AD App Registration — MICROSOFT_CLIENT_ID/SECRET have
// no existing counterpart anywhere else in this codebase, unlike Google's
// which reuse the login OAuth client. A human must create that app
// registration (Azure Portal > App registrations > New registration,
// redirect URI `${SERVER_URL}/api/v1/integrations/calendar/microsoft/callback`, a client
// secret, and the delegated Graph permission Calendars.ReadWrite) — until
// then isMicrosoftCalendarConfigured() returns false and every route 503s.

const MICROSOFT_CALENDAR_CALLBACK_URL = `${env.SERVER_URL}/api/v1/integrations/calendar/microsoft/callback`;
// User.Read so /me below can say which Microsoft account was connected.
const MICROSOFT_CALENDAR_SCOPE = "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access";

function authorizeEndpoint(): string {
  return `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`;
}

function tokenEndpoint(): string {
  return `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
}

export function isMicrosoftCalendarConfigured(): boolean {
  return Boolean(env.MICROSOFT_CLIENT_ID) && Boolean(env.MICROSOFT_CLIENT_SECRET) && isTokenCipherConfigured();
}

export function buildMicrosoftCalendarAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: MICROSOFT_CALENDAR_CALLBACK_URL,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_CALENDAR_SCOPE,
    state,
  });
  return `${authorizeEndpoint()}?${params.toString()}`;
}

export async function exchangeMicrosoftCalendarCode(code: string): Promise<CalendarTokenExchange> {
  const tokenResponse = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: env.MICROSOFT_CLIENT_SECRET ?? "",
      redirect_uri: MICROSOFT_CALENDAR_CALLBACK_URL,
      grant_type: "authorization_code",
      scope: MICROSOFT_CALENDAR_SCOPE,
    }),
  });

  if (!tokenResponse.ok) {
    throw new AppError("Failed to exchange Microsoft Calendar authorization code", 400, "OAUTH_EXCHANGE_FAILED");
  }

  const tokenBody = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  let accountEmail: string | null = null;
  const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (profileResponse.ok) {
    const profile = (await profileResponse.json()) as { mail?: string; userPrincipalName?: string };
    accountEmail = profile.mail ?? profile.userPrincipalName ?? null;
  }

  return {
    accessToken: tokenBody.access_token,
    refreshToken: tokenBody.refresh_token ?? null,
    expiresInSeconds: tokenBody.expires_in,
    scope: tokenBody.scope,
    accountEmail,
  };
}

export async function refreshMicrosoftAccessToken(refreshToken: string): Promise<CalendarTokenRefresh> {
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: env.MICROSOFT_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      scope: MICROSOFT_CALENDAR_SCOPE,
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to refresh Microsoft Calendar access token", 401, "CALENDAR_TOKEN_REFRESH_FAILED");
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}

export async function createMicrosoftCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload,
): Promise<CreatedCalendarEvent> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: event.title,
      body: { contentType: "text", content: [event.description, event.url].filter(Boolean).join("\n\n") },
      start: { dateTime: event.startIso, timeZone: "UTC" },
      end: { dateTime: event.endIso, timeZone: "UTC" },
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to create Microsoft Calendar event", 502, "CALENDAR_EVENT_CREATE_FAILED");
  }

  // Graph returns {id, webLink} — normalized to {id, htmlLink} here so
  // calendar.service.ts never has to branch on provider shape.
  const body = (await response.json()) as { id: string; webLink: string };
  return { id: body.id, htmlLink: body.webLink };
}

export async function updateMicrosoftCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventPayload,
): Promise<CreatedCalendarEvent> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: event.title,
      body: { contentType: "text", content: [event.description, event.url].filter(Boolean).join("\n\n") },
      start: { dateTime: event.startIso, timeZone: "UTC" },
      end: { dateTime: event.endIso, timeZone: "UTC" },
    }),
  });

  if (!response.ok) {
    throw new AppError("Failed to update Microsoft Calendar event", 502, "CALENDAR_EVENT_UPDATE_FAILED");
  }

  const body = (await response.json()) as { id: string; webLink: string };
  return { id: body.id, htmlLink: body.webLink };
}

export async function deleteMicrosoftCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new AppError("Failed to delete Microsoft Calendar event", 502, "CALENDAR_EVENT_DELETE_FAILED");
  }
}

export async function listMicrosoftCalendarEvents(
  accessToken: string,
  range: { startIso: string; endIso: string },
): Promise<RemoteCalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: range.startIso,
    endDateTime: range.endIso,
    $orderby: "start/dateTime",
    $top: "250",
  });
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}`, {
    // calendarview already expands recurring events into occurrences
    // (unlike a plain GET /events); the UTC preference keeps every
    // returned dateTime comparable without per-event timezone math.
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
  });

  if (!response.ok) {
    throw new AppError("Failed to list Microsoft Calendar events", 502, "CALENDAR_LIST_FAILED");
  }

  const body = (await response.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      webLink: string;
      isAllDay?: boolean;
      start: { dateTime: string };
      end: { dateTime: string };
    }>;
  };

  // Graph's UTC-preference dateTime strings have no trailing offset
  // (e.g. "2026-10-03T14:00:00.0000000") — append "Z" so they parse as the
  // UTC instants they actually are.
  return (body.value ?? []).map((item) => ({
    externalEventId: item.id,
    title: item.subject ?? "(No title)",
    description: item.bodyPreview || null,
    htmlLink: item.webLink,
    startAt: `${item.start.dateTime}Z`,
    endAt: `${item.end.dateTime}Z`,
    allDay: item.isAllDay ?? false,
  }));
}
