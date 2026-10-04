# Architecture

This page is for contributors who want a mental model of how SaveForLatter is built before changing code. It covers the monorepo layout, the server's module pattern, the request lifecycle, database conventions, and the three subsystems most contributions touch: AI (bring-your-own-key), the ingestion pipeline, and search.

It doesn't cover how to set up a local environment — see [Getting started](./GETTING_STARTED.md) for that — or the exact shape of every table and route, which the [feature reference](./README.md#features) covers page by page.

## Monorepo layout

The repository has no root workspace — `server/`, `client/`, and `extension/` are independent apps, each with its own `pnpm-workspace.yaml` and lockfile. `cd` into the app you're changing before running any command.

| Directory | What it is |
|---|---|
| `server/` | Express + TypeScript API. Every client (web, extension) talks to this. |
| `client/` | Next.js 16 web dashboard — the only client today. |
| `extension/` | Chrome MV3 browser extension. Built, not yet published to the Chrome Web Store. |
| `docs/` | This page and the other files in this directory. `BACKEND_REQUIREMENTS.md` and `AI_REQUIREMENTS.md` are the original target-design specs — treat them as historical context, not a description of the current implementation, which has since evolved past them in several places (most notably AI, which moved from platform-funded to bring-your-own-key). |

## Server module pattern

Feature code lives under `server/src/modules/<name>/`, one file per concern, wired through a barrel `index.ts`:

- `<name>.routes.ts` — an Express `Router`, mounted centrally in `src/routes/index.ts` under the `/api/v1` prefix
- `<name>.controller.ts` — reads the request, calls the service, returns `ApiResponse.success(...)` or lets an error propagate
- `<name>.service.ts` — business logic and database access; this is where a contributor spends most of their time
- `<name>.schema.ts` — Zod schemas for request validation
- `<name>.validator.ts` — Express middleware built from the schema, run before the controller

`src/modules/health/` is the smallest complete example of this pattern.

Every thrown error should be an `AppError(message, statusCode, code)` (`src/shared/errors/app-error.ts`). The global error handler, registered last in `src/app.ts`, converts it into the standard JSON error envelope. A route with no matching handler falls through to `notFound` (`src/shared/middlewares/not-found.ts`).

## Request lifecycle and authentication

Sign-in is OAuth only (Google or GitHub) — there's no password to store or check. `src/modules/auth/auth.service.ts` builds the provider's authorization URL, and `auth.controller.ts`'s callback handler exchanges the returned code, upserts the user, and issues a token pair:

- A short-lived **access token** (JWT, `JWT_ACCESS_EXPIRES_IN`, default 15 minutes), carrying the user's id and roles in its payload
- A longer-lived **refresh token** (`JWT_REFRESH_EXPIRES_IN`, default 7 days), stored hashed in the `refresh_tokens` table and tied to a `devices` row (see `shared/utils/device-fingerprint.ts`)

Both are set as httpOnly cookies. `authenticate` (`src/shared/middlewares/authenticate.ts`) reads and verifies the access token on every protected route, populating `req.user` from the JWT payload — it doesn't query the database on each request. `requireAdmin` (`src/shared/middlewares/require-admin.ts`) checks `req.user.roles.includes("admin")` from that same payload.

Because roles are embedded in the access token at sign-in, a role change doesn't take effect until the user's next token refresh or sign-in.

## Database conventions

`server/src/db/schema.ts` is the single Drizzle schema file: every table, every `pgEnum`, and the `defineRelations` block live here, numbered in comments as they were added. Enum string values live in `server/src/db/enums.ts` and are imported into `schema.ts` — add a new enum value there, not inline in `schema.ts`.

Two customizations worth knowing about before touching anything AI- or search-related:

- **`vector(n)`** (`src/db/pgvector-type.ts`) is a hand-written Drizzle column type for pgvector, since Drizzle has no built-in one. `EMBEDDING_DIMENSIONS` (1536) is exported from the same file and must stay in sync with whatever embedding model actually writes to it — see [AI architecture](#ai-architecture-bring-your-own-key) below.
- **`tsvector(name)`** wraps a column populated by a database trigger (defined in the migration that added it), never written by application code — it only exists so the column appears correctly in generated migrations.

Generate and apply schema changes with:

```bash
npx drizzle-kit generate   # writes a migration from your schema.ts edit
npx drizzle-kit migrate    # applies pending migrations
```

## AI architecture (bring your own key)

Every AI capability — summarizing, tagging, image analysis, the Ask assistant, and (optionally) embeddings — runs on an API key the *user* connects, not one the server holds. `server/src/modules/ai/ai.providers.ts` is the one file that knows how to turn a saved credential into a real LangChain client; every other module calls into it rather than constructing a provider client directly.

The system has two tables (`server/src/modules/ai-settings/`):

- **`ai_credentials`** — one row per saved key: provider (`openai` | `anthropic` | `groq` | `google` | `custom`), a user-facing label, the API key encrypted at rest (AES-256-GCM, `shared/crypto/token-cipher.ts`), and a base URL (only meaningful for `custom`).
- **`user_ai_role_assignments`** — one row per (user, role), pointing a role at a saved credential and a model string. The four roles are `fast` (tagging/classification), `reasoning` (the Ask agent), `vision` (image analysis), and `embeddings` (search).

`getChatModel(userId, tier)`, `getEmbeddings(userId)`, and `getVisionModels(userId)` in `ai.providers.ts` resolve a role to a real client, or return `null` / `[]` when the role isn't configured. **Every call site treats an unconfigured role as "skip this step," never as an error** — a memory with no AI configured still saves successfully, just without AI enrichment, and the Ask agent replies with a plain-text prompt to connect a key instead of crashing.

Embeddings are the one exception to pure bring-your-own-key: if the server has `EMBEDDINGS_API_KEY` set, `getEmbeddings` falls back to it when a user hasn't configured their own, so semantic search works immediately for a new account. A user's own embeddings credential, when set, always takes priority over that default.

Because `memories.document_embedding` and `memory_chunks.embedding` are fixed-width `vector(1536)` columns, an embeddings role assignment is only accepted after a live test call confirms the model actually returns 1536-dimensional vectors (`testRoleCredential` in `ai.providers.ts`) — a mismatched model is rejected at save time with the real dimension count, not discovered later at query time.

## Ingestion pipeline

Every memory — regardless of type — goes through the same LangGraph state machine (`server/src/modules/ai/ingestion/graph.ts`) after it's created, running as a background BullMQ job (`ingestion/queue.ts`, `ingestion/worker.ts`):

```
parser ─┬─ CorrectCaption ── ClassifyIntent ─┬─ GenerateAIInsights ─┬─ OrganizeCollection ─┐
        ├─ DetectContentType ────────────────┤                      │                      ├─ UpsertVectors
        │                                    └─ DetectEvent ────────┼──────────────────────┤
        └─ SemanticChunker ─────────────────────────────────────────┴─ GenerateEmbeddings ─┘
```

Steps run in parallel wherever they don't depend on each other. Each node reads and writes to a shared `IngestionState` (`ingestion/state.ts`). The AI enrichment steps are wrapped in `optional()` in `graph.ts`: if one throws, or returns a field in the wrong shape, that step's output is repaired or dropped and the rest of the pipeline continues, so a memory keeps whatever succeeded. Reaching `UpsertVectors` marks a memory `ready` or `partial`; only an unexpected error outside the enrichment steps (a parser, embeddings, the database) reaches the worker's `failed` handler.

## Search architecture

Search runs two legs in parallel and merges them with Reciprocal Rank Fusion (`server/src/modules/ai/search/rrf.ts`):

- **Lexical** — Postgres full-text search against a trigger-maintained `tsvector` column
- **Semantic** — cosine similarity against the embeddings described above, skipped entirely when embeddings aren't available for that user

`hybrid-search.ts` backs the dashboard's Search page (memory-level results); `rag/chunk-search.ts` backs the Ask agent's `search_memories` tool (chunk-level, passage-granularity results, rolled up to one card per memory). Both degrade to lexical-only if the semantic leg fails or isn't configured — semantic search is additive, never a hard dependency.

## Ask agent (RAG)

The Ask assistant is a LangGraph tool-calling agent (`server/src/modules/ai/rag/graph.ts`): a front-desk classifier gates obviously off-topic requests, the main agent node calls tools and produces a reply, and a grounding check verifies the reply is actually supported by tool output before it reaches the user (retried once if not).

Tools live in `rag/tools/` and are read-only or write, covering both search and direct account changes:

- `search_memories`, `search_memories_by_date` — retrieval
- `create_memory`, `update_memory`, `delete_memory`, `create_collection` — writes, calling the exact same service functions the REST API uses
- `create_calendar_event` — writes, same calendar service the dashboard's "New event" form uses

`delete_memory` moves a memory to Trash rather than deleting it permanently — the same recoverable action as the dashboard's own delete button, deliberately, so an agent acting on a misread request can't cause unrecoverable loss. A new tool is a new file in `rag/tools/` plus one entry in `rag/tools/index.ts` and a short section in `rag/prompts.ts`'s `AGENT_SYSTEM_PROMPT` describing when to use it — no graph changes needed.
