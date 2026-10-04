# Collections and tags

This page describes how collections and tags are structured. Use this as a reference before modifying categorization logic.

Collections are folders; tags cut across them. Both live in `server/src/modules/collection/` and are referenced from `memory.service.ts`.

The following list describes the collection and tag behavior:

- A collection's `source` is `user` for every collection the API, the Ask agent's `create_collection` tool, and the ingestion pipeline's `OrganizeCollection` node create. Nothing is hidden: earlier versions stored AI-created collections as `system` and hid them by default (the `includeSystem` query parameter shows them); a data migration turned all existing ones into ordinary collections, and no code creates `system` collections any more.
- Converting a system collection to a user collection (`convertToUser`) is one-way.
- Tags are scoped per user. A tag name is unique within its owner, resolved or created on demand by `resolveTagIds` (`memory.service.ts`), and shared by both the REST API and the Ask agent's `update_memory` tool.
