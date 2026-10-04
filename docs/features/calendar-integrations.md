# Calendar integrations

This page describes how the application connects to external calendar providers. Use this as a reference before modifying the OAuth flow or event creation logic.

The `server/src/modules/integrations/calendar/calendar.service.ts` file connects Google Calendar or Microsoft Outlook via OAuth. It stores encrypted access and refresh tokens per (user, provider) pair in `calendar_connections`.

The following list describes the calendar event behaviors:

- **Write paths:** `pushMemoryToCalendar` and `createStandaloneCalendarEvent` are the two write paths. The Ask agent's `create_calendar_event` tool and the dashboard's "New event" form both call `createStandaloneCalendarEvent`.
- **AI detection:** The AI ingestion pipeline's `DetectEvent` node (see [Ingestion pipeline](../ARCHITECTURE.md#ingestion-pipeline)) flags a memory that reads like an appointment or deadline. Above a confidence threshold, it notifies the user with a one-click option to push it to a connected calendar. It never pushes automatically.
- **Deduplication:** The `calendar_event_links` table records one row per (memory, provider) actually pushed, ensuring the system never double-creates the same memory on a second push attempt.
