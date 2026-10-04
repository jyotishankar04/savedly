# Import

This page describes how the application imports links and bookmarks. Use this as a reference before modifying bulk-ingestion or deduplication logic.

The `server/src/modules/import/import.service.ts` file accepts a bookmarks HTML export or a plain list of URLs (up to `IMPORT_MAX_URLS` per batch). It deduplicates against the user's existing `normalized_url`s in one bulk query, and then creates and enqueues each new memory using the same mechanism that `createMemory` uses for a single save.
