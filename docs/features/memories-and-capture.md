# Memories and capture

This page describes how the system captures and stores memories. Use this as a reference before modifying memory creation, updates, or deletion logic.

A memory is the core record: a saved web link, note, image, document, or voice recording. The `server/src/modules/memory/memory.service.ts` file owns creation, updates, and deletion.

The following list describes the primary operations:

- **Create:** `createMemory` inserts the row, links any attachments, collections, or tags provided at creation, and then fires `enqueueIngestion`. This is a fire-and-forget BullMQ enqueue that must never fail the create request itself.
- **Update:** `updateMemory` handles regular field edits and the two soft states: `isFavorite` / `isArchived` (toggles) and `inTrash` (moves to Trash, starting a 15-day purge clock; restoring clears that clock).
- **Delete:** `deleteMemory` is a permanent, hard delete. The dashboard only exposes it from the Trash page, behind a confirmation dialog, on an item already in the Trash. Everywhere else (including the Ask agent), a "delete" action means moving the memory to Trash by using `updateMemory({ inTrash: true })`.
- **File attachments:** Attachments go to Cloudflare R2 via a presigned upload (`server/src/modules/upload/`). The file's bytes never pass through the server itself.

See the [Ingestion pipeline](../ARCHITECTURE.md#ingestion-pipeline) for what happens to a memory after the system creates it.
