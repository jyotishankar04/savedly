// Shared shape both provider clients normalize to, so calendar.service.ts
// never branches on which API it's talking to.
export interface CalendarEventPayload {
  title: string;
  description: string | null;
  url: string | null;
  /** ISO 8601. */
  startIso: string;
  /** ISO 8601. */
  endIso: string;
}

export interface CalendarTokenExchange {
  accessToken: string;
  /** Null when the provider didn't return one (e.g. a repeat consent without prompt=consent). */
  refreshToken: string | null;
  expiresInSeconds: number;
  scope: string;
  accountEmail: string | null;
}

export interface CalendarTokenRefresh {
  accessToken: string;
  expiresInSeconds: number;
}

export interface CreatedCalendarEvent {
  id: string;
  htmlLink: string;
}

// A single event as read back FROM a provider's list/calendarview API —
// normalized the same way CreatedCalendarEvent is for creation, so
// calendar.service.ts's merge logic never branches on provider shape here
// either.
export interface RemoteCalendarEvent {
  externalEventId: string;
  title: string;
  description: string | null;
  htmlLink: string;
  /** ISO 8601. */
  startAt: string;
  /** ISO 8601. */
  endAt: string;
  /** A whole-day event: startAt/endAt are midnight UTC of its dates (end exclusive), not real instants. */
  allDay: boolean;
}
