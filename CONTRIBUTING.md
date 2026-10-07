# Contributing to Savedly

Thanks for considering a contribution — bug fixes, new features, documentation, or just fixing something that bugs you are all welcome.

By participating, you're expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

Savedly is licensed under [AGPL-3.0](./LICENSE). By submitting a contribution, you agree that it's licensed under the same terms.

## Ways to contribute

- **Report a bug** — [open an issue](https://github.com/jyotishankar04/saveforlatter/issues/new) with steps to reproduce, what you expected, and what actually happened.
- **Suggest a feature** — open an issue describing the problem it solves, not just the feature itself.
- **Fix something** — browse [open issues](https://github.com/jyotishankar04/saveforlatter/issues), especially any marked `good first issue`, or fix something you've personally run into.
- **Improve the docs** — the README, [`docs/`](./docs/README.md), `CLAUDE.md`, or the in-app Help Center are all fair game.

## Before you start

For a small, focused change (a bug fix, a docs fix, a small UI tweak), just open a PR — no need to ask first.

For anything larger — a new feature, a new dependency, a change that touches the database schema, auth, or how AI providers are wired up — **open an issue first** to discuss the approach before you spend time implementing it. This saves everyone the awkward conversation after a big PR already exists: it's much easier to redirect an idea before code is written than to ask for a rewrite after.

## Project structure and architecture

This is a monorepo of independent apps with no root workspace. Read [`docs/README.md`](./docs/README.md) before making a non-trivial change — it links to a getting-started guide, the architecture, and a reference page per feature. `CLAUDE.md` is a denser, single-file version of the same material. The short version:

- `server/` — Express + TypeScript API. `pnpm dev` / `pnpm typecheck` from inside it.
- `client/` — Next.js 16 web dashboard. `pnpm dev` / `pnpm lint` from inside it.
- `extension/` — Chrome MV3 browser extension. `pnpm dev` from inside it.

## Getting set up

See [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md) for the full local setup. You need Node.js, pnpm and Docker, and nothing else: no OAuth app and no cloud account. Sign-in works with an email and password locally, and the first account you create is an admin.

Both `server/` and `client/` have a typecheck you should run before opening a PR — the same checks CI runs on every PR:

```bash
cd server && pnpm typecheck
cd client && pnpm lint && pnpm build
```

There's no automated test suite yet, so CI catches typecheck/lint/build failures but not behavioral regressions — describe how you tested a change manually in your PR description.

## Making a change

1. Fork the repo and create a branch off `main` for your change — never `prod-web` or `prod-server`, which only ever receive a release PR from `main` (see [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md) if you're curious how releases work).
2. Make your change, keeping it focused — a bug fix doesn't need an unrelated refactor riding along with it.
3. Run the relevant typecheck/lint/build commands above.
4. Commit with a clear message describing *why* the change was made, not just what changed.
5. Open a pull request against `main`, describing what changed, why, and how you tested it. CI runs automatically; a maintainer reviews and merges.

## Code style

There's no linter configured on the server yet, and `client/`'s ESLint config is the source of truth there. Beyond that, match the conventions already in the file you're editing — this codebase leans toward small, focused modules and comments that explain *why* something is done a certain way, not *what* the code does (the code already says that).

## Questions

Not sure where to start, or want to talk through an idea before building it? Ask in the [Discord server](https://discord.gg/PzGFcMNyRK) (`#contributing`), or open an issue.
