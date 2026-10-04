# Getting started

This page walks through a full local setup — server, database, and client — and how to confirm each piece actually works, in more depth than the [repo README](../README.md#getting-started)'s quick version. By the end, you'll have the dashboard running locally, signed in, and able to save and search a memory.

## Before you begin

- [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com) (for local Postgres, Redis, and Mailhog)
- A Google or GitHub OAuth app, for sign-in — see [OAuth setup](#oauth-setup) below
- Optional: an API key from any AI provider (OpenAI, Anthropic, Groq, Google, or an OpenAI-compatible endpoint), for testing AI features later

This repository has **no root workspace** — `server/`, `client/`, and `extension/` are independent apps, each with its own `pnpm-workspace.yaml` and lockfile. `cd` into an app directory before running any command in it.

## Start local infrastructure

From `server/`, start Postgres (with `pgvector`), Redis, and Mailhog (a local SMTP catcher — outgoing email lands in a web UI, not a real inbox):

```bash
cd server
docker compose up -d db redis mailhog
```

> [!NOTE]
> `docker-compose.yml` also defines a `langfuse-*` service group for optional LLM call tracing. Leave it out of `docker compose up` unless you're specifically working on tracing — it pulls in ClickHouse and MinIO, and `LANGFUSE_*` env vars are optional; the app runs fine without it.

## Configure and start the server

```bash
pnpm install
cp .env.example .env
```

Open `.env` and fill in the values — every variable has a comment explaining what it's for and how to get it. At minimum, you need:

- `DATABASE_URL` and `REDIS_URL` — already correct for the `docker compose` services above
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SHARE_TOKEN_SECRET`, `VAULT_TOKEN_SECRET`, `CALENDAR_STATE_SECRET` — each generated with the command in its own comment in `.env.example`
- `GOOGLE_CLIENT_ID`/`SECRET` or `GITHUB_CLIENT_ID`/`SECRET` — see [OAuth setup](#oauth-setup)
- `R2_*` — Cloudflare R2 credentials, for file attachments (see the comment block in `.env.example` for setup)

Then apply the database schema and start the server:

```bash
npx drizzle-kit migrate
pnpm dev
```

Confirm it's running:

```bash
curl http://localhost:4000/api/v1/health
```

The response is `{"success":true,"data":{"uptime":...},...}`.

## OAuth setup

Sign-in is OAuth only — there's no password to configure. Set up at least one provider:

- **Google** — [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → create an OAuth client. Authorized redirect URI: `http://localhost:4000/api/v1/auth/google/callback`.
- **GitHub** — [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App. Authorization callback URL: `http://localhost:4000/api/v1/auth/github/callback`.

Both `GOOGLE_CLIENT_ID`/`SECRET` and `GITHUB_CLIENT_ID`/`SECRET` are required by `server/src/config/env.ts` at startup — you need at least one real pair, even if you only intend to sign in with one provider (fill the other with a placeholder if you're not using it, but see that file if it rejects a blank value).

## Start the client

In a separate terminal:

```bash
cd client
pnpm install
pnpm dev
```

Open `http://localhost:3000`, sign in, and save something — a link or a plain note. Confirm it appears on the Memories page, and that keyword search finds it from the Search page. Both work with no further setup.

## Connect an AI key

Semantic search works out of the box (the server covers embeddings by default), but summaries, tags, and the Ask assistant need a key you provide. From the dashboard: **Settings → AI → Add key**, then assign it to a role (Fast, Reasoning, or Vision). See [AI settings](./features/ai-settings.md) for what each role does.

## What's next

- [Architecture](./ARCHITECTURE.md) — the mental model before you change anything
- [Features](./README.md#features) — a reference page per feature
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — the branch/PR flow and the typecheck/lint commands to run before opening one
