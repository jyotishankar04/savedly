# AI settings

This page describes the bring-your-own-key AI configuration. Use this as a reference before modifying AI providers, keys, or roles.

See [AI architecture](../ARCHITECTURE.md#ai-architecture-bring-your-own-key) for the credential and role model.

The following table lists the endpoints that manage AI settings:

| Route | Purpose |
|---|---|
| `GET/POST /api/v1/ai-settings/credentials` | List or add a provider key. |
| `PATCH/DELETE /api/v1/ai-settings/credentials/:id` | Edit or remove a key. |
| `GET /api/v1/ai-settings/roles` | List current role assignments. |
| `PUT/DELETE /api/v1/ai-settings/roles/:role` | Assign or unassign a role. A `PUT` request runs a live test call before saving. |
| `POST /api/v1/ai-settings/test` | Test a not-yet-saved key. The settings UI uses this before committing to the key. |
| `GET /api/v1/ai-settings/platform-defaults` | Shows which roles the server covers without a user key (for example: `embeddings`, when `EMBEDDINGS_API_KEY` is set). |

The client page (`client/app/(platfrom)/app/settings/ai/page.tsx`) renders credentials and role assignments as inline forms rather than modals. Each of the four roles is always visible with its own key and model selector.
