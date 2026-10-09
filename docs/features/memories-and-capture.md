# Memories and capture

This page describes how the system captures and stores memories. Use this as a reference before modifying memory creation, updates, or deletion logic.

A memory is the core record: a saved web link, note, image, document, or voice recording. The `server/src/modules/memory/memory.service.ts` file owns creation, updates, and deletion.

The following list describes the primary operations:

- **Create:** `createMemory` inserts the row, links any attachments, collections, or tags provided at creation, and then fires `enqueueIngestion`. This is a fire-and-forget BullMQ enqueue that must never fail the create request itself.
- **Update:** `updateMemory` handles regular field edits and the two soft states: `isFavorite` / `isArchived` (toggles) and `inTrash` (moves to Trash, starting a 15-day purge clock; restoring clears that clock).
- **Delete:** `deleteMemory` is a permanent, hard delete. The dashboard only exposes it from the Trash page, behind a confirmation dialog, on an item already in the Trash. Everywhere else (including the Ask agent), a "delete" action means moving the memory to Trash by using `updateMemory({ inTrash: true })`.
- **File attachments:** Attachments go to Cloudflare R2 via a presigned upload (`server/src/modules/upload/`). The file's bytes never pass through the server itself.

See the [Ingestion pipeline](../ARCHITECTURE.md#ingestion-pipeline) for what happens to a memory after the system creates it.

## Duplicate detection

Code: `server/src/modules/memory/duplicates.ts`, the pipeline step `server/src/modules/ai/ingestion/nodes/detect-duplicate.ts`, and `client/components/memory/duplicate-dialog.tsx`.

A save is a duplicate when the library already holds:

- a link with the same address, after `normalize-url.ts` removes tracking parameters and similar noise, or
- a note with the same text, ignoring case and surrounding spaces. Notes under 20 characters are not compared.

Both are exact matches and need no model call. Memories in Trash are ignored.

There are two paths, and which one runs depends on `onDuplicate` in `POST /memories`:

| `onDuplicate` | Sent by | What happens |
| --- | --- | --- |
| `"ask"` | The web app | Nothing is saved. The API answers `409 DUPLICATE_MEMORY` with the existing memory in `error.details.existing`, and the app shows a dialog: **Skip** or **Add anyway**. |
| `"allow"` | The web app, after **Add anyway** | The memory is saved with `duplicate_status = 'kept'`, so it is never asked about again. |
| left out | The extension, a share from a phone, the API | The memory is saved. The pipeline's `detectDuplicate` step then checks it and, if it repeats something, sets `duplicate_status = 'pending'` and creates a `duplicate_detected` notification. |

The notification is answered with `POST /memories/:id/duplicate` and `{ "action": "skip" | "keep" }`. **Skip** moves the new copy to Trash; **keep** leaves both. Either way the notification is marked read. If the app is open when the notification arrives, it is shown as a popup; closing the popup without choosing removes nothing.

`duplicate_status` is null until a memory has been checked, and a memory is only ever checked once, so re-processing it never raises the question again.

