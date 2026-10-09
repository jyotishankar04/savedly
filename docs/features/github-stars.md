# GitHub stars

A user connects their GitHub account, and the public repositories they have starred are added to their library as ordinary saved links. Each one then goes through the normal ingestion pipeline, so it gets a summary and tags and can be found by search and by Ask.

Code: `server/src/modules/integrations/github/` and `client/components/integrations/github-stars-card.tsx`.

## How it works

1. **Connect.** `GET /api/v1/integrations/github/connect` redirects to GitHub's consent screen with the scope `read:user`. A signed, 10-minute `state` token carries the user's id.
2. **Callback.** GitHub redirects to `/api/v1/auth/github/callback/stars`. The token is encrypted with `shared/crypto/token-cipher.ts` and stored in `github_connections`. The first sync starts in the background and the browser returns to the Integrations page.
3. **Sync.** `syncGithubStars` reads `/user/starred`, newest first, and adds what is new:
   - The first sync takes the most recent 500 stars (`FIRST_SYNC_MAX`).
   - Later syncs stop at `last_starred_at`, the newest star already dealt with.
   - A repository whose address is already in the library is skipped.
   - Private repositories are never added.
4. **Schedule.** A BullMQ job (`github.job.ts`) syncs every working connection every 12 hours. "Sync now" does the same for one user, at most once a minute.

## Why the callback lives under `/auth`

The integration reuses the OAuth app that powers "Sign in with GitHub", so there is nothing extra to set up. GitHub only redirects to addresses under the app's registered callback URL, which is `/api/v1/auth/github/callback`. The stars callback is therefore `/api/v1/auth/github/callback/stars`, mounted in `routes/index.ts` ahead of the auth routes.

## Limits and failures

| Situation | What happens |
| --- | --- |
| The plan's library is full | The stars that fit are added, oldest first. The rest are counted in `last_error`, and the cursor stops before them, so the next sync tries them again. |
| The user revoked access on GitHub | `needs_reconnect` is set, syncing stops, and the card offers "Connect again". Reconnecting the same account carries on where it left off. |
| A different GitHub account is connected | The cursor and count start over. |
| Disconnect | The row is deleted and GitHub is asked to revoke the token. Repositories already added stay in the library. |

AI processing for added repositories counts against the plan's allowance like any other save.

## Availability

The card is live when GitHub sign-in is configured on the server and the admin switch **GitHub stars** (`features.integrations.github_stars.enabled`, Admin > Features) is on. `GET /config` reports this as `githubStars`. Otherwise the card stays in the planned list.

## Not included

- Private repositories. Reading those needs the `repo` scope, which grants access to code.
- Removing a repository from the library when it is unstarred.
- Using topics as tags. Tags come from the normal AI pass.
