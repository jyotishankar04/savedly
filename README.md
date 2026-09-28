<div align="center">

<img src="client/app/icon.svg" alt="SaveForLatter" width="64" />

# SaveForLatter

**Save anything. Ask it anything.**

A personal memory tool that reads, organizes, and helps you find what you save — by keyword or by meaning. Free and open source, with AI features that run on your own API key.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Open Source](https://img.shields.io/badge/open%20source-%E2%9D%A4-blue)](./CONTRIBUTING.md)

[Overview](#overview) • [Features](#features) • [Tech stack](#tech-stack) • [Getting started](#getting-started) • [Bring your own AI key](#bring-your-own-ai-key) • [Project structure](#project-structure) • [Getting help](#getting-help)

</div>

<!-- TODO: add a screenshot or short demo GIF of the dashboard here -->

## Overview

Send SaveForLatter a link, a note, an image, a document, or a voice memo, and it's read, summarized, tagged, and made searchable — automatically, the same pipeline every time, whatever format it came in. Ask it a question in plain English and it answers from what you've actually saved, citing exactly which memory it came from.

There's no paid tier. Every feature is unlimited on every account, the code is public, and AI processing runs on a provider account you connect yourself rather than one we pay for on your behalf.

## Features

- **Capture anything** — links, notes, images, documents, and voice memos, all through one capture bar
- **Automatic enrichment** — read, summarized, tagged, and embedded on the way in, no manual tagging required
- **Hybrid search** — keyword and meaning-based (semantic) search merged into a single ranked list
- **Ask SaveForLatter** — a chat assistant over your saved content that can also create, edit, organize, and delete memories directly, not just answer questions about them
- **Collections & tags** — organize manually, or let AI file things into a fitting collection automatically
- **Sharing** — public, password-protected, or invite-only links, with per-person access requests
- **Vault** — a PIN-gated space for memories you'd rather keep out of your regular views
- **Calendar sync** — connect Google Calendar or Outlook; AI-detected events push in one click
- **Bring your own AI key** — OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint

> [!NOTE]
> Semantic search works out of the box even without a key of your own — embeddings are the one AI role the project covers by default, since they're inexpensive to run. Everything else (summaries, tags, the Ask assistant) needs your own key. See [Bring your own AI key](#bring-your-own-ai-key).

## Tech stack

| App | Stack |
|---|---|
| `server/` | Express + TypeScript, Drizzle ORM (Postgres + `pgvector`), BullMQ, LangGraph |
| `client/` | Next.js 16 (App Router), React, Tailwind CSS |
| `extension/` | Vite + React, Chrome Manifest V3 *(built, not yet published)* |

This is a monorepo of independent apps with **no root workspace** linking them — each has its own `pnpm-workspace.yaml` and lockfile. `cd` into an app directory before installing or running anything.

## Getting started

> [!IMPORTANT]
> Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io). The server also needs Postgres 15+ (with the `pgvector` extension) and Redis — `docker compose up` from `server/` starts both locally, plus Mailhog for local email testing.

```bash
# 1. Server
cd server
pnpm install
cp .env.example .env      # fill in the values you need — see the comments in that file
docker compose up -d
npx drizzle-kit migrate
pnpm dev                  # http://localhost:4000
```

```bash
# 2. Client (in a separate terminal)
cd client
pnpm install
pnpm dev                  # http://localhost:3000
```

```bash
# 3. Extension (optional)
cd extension
pnpm install
pnpm dev
```

Sign in, then head to **Settings → AI** to connect a provider key — that's what unlocks summaries, tags, and the Ask assistant. Saving and keyword search both work immediately without one.

## Bring your own AI key

AI features are intentionally not something this project pays for on your behalf. Connect a key from **Settings → AI**:

| Role | What it powers | Providers |
|---|---|---|
| Fast | Tagging, classification, quick extraction | OpenAI, Anthropic, Groq, Google, or a custom OpenAI-compatible endpoint |
| Reasoning | The Ask assistant, anything needing real judgment | same as above |
| Vision | Reading and describing saved images | same as above |
| Embeddings | Semantic search | same as above — must output exactly 1536-dimensional vectors; covered by a default key if you don't set your own |

Each role can point at a different provider and model, or share one key across several. Every assignment is tested live against the real provider before it's saved.

## Project structure

Start with [`docs/README.md`](./docs/README.md) for the full contributor documentation — a getting-started guide, the architecture, and a reference page per feature. [`CLAUDE.md`](./CLAUDE.md) is a second, denser guide to the same codebase written for AI coding agents, which also works well as a human quick-reference.

```
server/     Express API — feature modules under src/modules/<name>/
client/     Next.js dashboard — app/(marketing)/ and app/(platfrom)/app/
extension/  Chrome MV3 extension — popup, service worker, content script
docs/       Contributor documentation — start at docs/README.md
```

## Getting help

- **Found a bug or want a feature?** [Open an issue](https://github.com/jyotishankar04/saveforlatter/issues) or use the in-app report form (`/report`).
- **Want to contribute code?** See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup and PR conventions, and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for the ground rules.
- **Found a security issue?** Please don't open a public issue — see [`SECURITY.md`](./SECURITY.md).

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0). You can use, modify and self-host it freely; if you run a modified version as a network service, you must make your source code available to its users under the same license.
