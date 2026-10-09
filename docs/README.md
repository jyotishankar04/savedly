# Documentation

This is the contributor documentation for Savedly — everything past "how do I install it," which the [repo README](../README.md) already covers.

Read these three in order the first time; after that, come back to whichever page answers your question.

1. **[Getting started](./GETTING_STARTED.md)** — get a full local environment running and verify it works, beyond the README's quick version.
2. **[Architecture](./ARCHITECTURE.md)** — the mental model: monorepo layout, the server's module pattern, the request lifecycle, database conventions, and how AI, ingestion, and search fit together.
3. **Features** (below) — a reference page per feature.

## Features

A reference page per feature, each naming the service file that owns it, the tables it touches, and the constraints worth knowing before you change it:

- [Accounts and sessions](./features/accounts-and-sessions.md)
- [Memories and capture](./features/memories-and-capture.md)
- [Collections and tags](./features/collections-and-tags.md)
- [Search](./features/search.md)
- [Ask assistant](./features/ask-assistant.md)
- [AI settings (bring your own key)](./features/ai-settings.md)
- [Sharing](./features/sharing.md)
- [Vault](./features/vault.md)
- [Calendar integrations](./features/calendar-integrations.md)
- [GitHub stars](./features/github-stars.md)
- [Import](./features/import.md)
- [Notifications](./features/notifications.md)
- [Admin](./features/admin.md)

## Other documents in this directory

- [`SELF_HOSTING.md`](./SELF_HOSTING.md) — run your own install with one command, connect storage/email/OAuth from Admin > Infrastructure, back up and upgrade.
- [`RELEASE_PROCESS.md`](./RELEASE_PROCESS.md) — for maintainers: how `main` gets promoted to `prod-web` and `prod-server` independently, and how to hotfix a live bug. Contributors don't need this — your PR always targets `main`.
- [`DEPLOY_AWS.md`](./DEPLOY_AWS.md) — for maintainers: running the hosted API on one AWS instance behind Cloudflare, with automatic deploys from `prod-server`.
- [`AI_REQUIREMENTS.md`](./AI_REQUIREMENTS.md) and [`BACKEND_REQUIREMENTS.md`](./BACKEND_REQUIREMENTS.md) are the original target-design specs this project was built from. Treat them as historical context, not a description of the current implementation — AI in particular has moved well past what they describe, from a platform-funded design to the bring-your-own-key one [Architecture](./ARCHITECTURE.md) documents.
- [`URL_CAPTURE_AND_PREVIEW.md`](./URL_CAPTURE_AND_PREVIEW.md) covers how a saved link's preview (title, image, favicon) is resolved.
- [`KEYMAPS.md`](./KEYMAPS.md) lists the dashboard's keyboard shortcuts.

## Contributing

If you're here to make a change, see [`CONTRIBUTING.md`](../CONTRIBUTING.md) at the repo root for the fork-and-PR flow and the typecheck/lint commands to run before opening one.
