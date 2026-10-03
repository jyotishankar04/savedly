# Release process

This page is for maintainers promoting work from `main` to a production branch, and for handling a bug already live in production directly. If you're contributing a change, you don't need this page — see [`CONTRIBUTING.md`](../CONTRIBUTING.md) instead; your PR always targets `main`.

`client/` and `server/` are independently deployable, so each has its own production branch and its own release cadence — shipping a client change doesn't require also shipping the server, and vice versa.

## Branch roles

| Branch | What it is | Who pushes to it |
|---|---|---|
| `main` | Active development and integration — "what we're currently building." Every PR lands here first, for both apps. | Contributors and maintainers, via PR |
| `prod-web` | Live, stable code for `client/` — "what users are currently running on the web dashboard." | Only a maintainer, via an explicit release PR or a hotfix PR |
| `prod-server` | Live, stable code for `server/` — "what's currently deployed as the API." | Only a maintainer, via an explicit release PR or a hotfix PR |
| `feature/*`, `fix/*` | Work in progress, branched off `main` | Whoever's making the change |
| `hotfix/*` | A fix for a bug already live in `prod-web` or `prod-server` | A maintainer, branched off that production branch |

A merge into `prod-server` deploys the API automatically; see [Deploy the API to AWS](./DEPLOY_AWS.md).

`main → prod-web` and `main → prod-server` are the normal directions, and they're independent — releasing one doesn't require releasing the other. `prod-web → main` or `prod-server → main` only happens as part of a hotfix (below) — never as a routine merge.

## Normal feature flow

Identical whether you're the maintainer or an external contributor working from a fork, and regardless of which app the change touches:

```bash
git checkout main
git pull origin main
git checkout -b feat/something
# ... make the change ...
git push -u origin feat/something
```

Open a pull request against `main`. CI runs `server`'s typecheck and `client`'s lint + build. A maintainer reviews and merges.

## Promoting `main` to a production branch

Don't merge individual feature branches into `prod-web` or `prod-server`, and don't do it automatically as part of merging to `main`. Promotion is its own explicit decision, made separately per app:

1. Confirm `main` is in a state you're willing to ship **for that app** — it's fine if the other app has unrelated in-progress work on `main`; you're only promoting the app you're releasing.
2. Open a pull request from `main` into `prod-web` (or `prod-server`), titled `Release: web vX.Y.Z` (or `Release: server vX.Y.Z`), with a description like:

   ```markdown
   ## What's included

   - Semantic search improvements
   - Browser extension fixes

   ## Testing

   - [x] Typecheck / lint / build (CI)
   - [x] Manually verified on main

   ## Database changes

   - [ ] None
   ```

3. CI runs the same checks against the merge result. Review it yourself (or have a trusted maintainer review it, once one exists), and merge.

## Tagging a release

After merging a release PR, tag it with the app name as a prefix so `web-*` and `server-*` tags don't collide:

```bash
# web
git checkout prod-web
git pull origin prod-web
git tag web-v0.x.0
git push origin web-v0.x.0

# server
git checkout prod-server
git pull origin prod-server
git tag server-v0.x.0
git push origin server-v0.x.0
```

This gives you a fixed point to roll back to if something goes wrong later.

## Hotfixing a production branch

If `prod-web` or `prod-server` breaks, don't patch it by hand or merge `main` wholesale (`main` may have unrelated in-progress work, including for the *other* app). Branch directly off the affected production branch:

```bash
git checkout prod-server            # or prod-web
git pull origin prod-server
git checkout -b hotfix/fix-something
# ... fix it ...
git push -u origin hotfix/fix-something
```

Open a PR: `hotfix/fix-something` → `prod-server` (or `prod-web`). Once merged and tagged, **port the same fix into `main` too** — cherry-pick the commit or open a matching PR against `main`. This step is easy to forget and important: without it, the next `main → prod-server` release silently reintroduces the bug you just fixed, because `main` never had the fix in the first place.

```
hotfix/fix-something
   │         │
   ↓         ↓
prod-server  main
```

(Same shape for a `prod-web` hotfix.)

## Summary

- Contribute: PR into `main`. Always, regardless of app.
- Ship the web dashboard: an explicit `main → prod-web` release PR, then a `web-vX.Y.Z` tag.
- Ship the API: an explicit `main → prod-server` release PR, then a `server-vX.Y.Z` tag.
- Production broke: `hotfix/*` off the affected `prod-web`/`prod-server` branch → PR into it → port the same fix into `main`.
