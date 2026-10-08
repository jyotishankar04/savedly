# Self-host Savedly

This guide is for anyone who wants to run their own Savedly on a computer or server they control. You need basic comfort with a terminal. Self-hosting is free: every feature works, with no plan limits.

This guide covers installing, first sign-in, connecting services, backups, upgrades and running it on your own domain. It doesn't cover developing Savedly itself; for that, see [Getting started](./GETTING_STARTED.md).

## Before you begin

You need:

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (`docker compose version` prints a version).
- [Git](https://git-scm.com/downloads).
- About 2 GB of free memory and a few GB of disk for your library.
- An API key from an AI provider (OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, or any OpenAI-compatible server). Savedly uses it to read, summarize and tag what you save.

## Install

Run the installer:

```sh
curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/install.sh | sh
```

The installer clones the repository into `./savedly` and starts it. The first run builds the images and takes a few minutes.

To install by hand instead, run the following commands:

```sh
git clone https://github.com/jyotishankar04/saveforlatter.git
cd savedly
docker compose up -d
```

Before exposing the install to the internet, create a root `.env` from
`.env.example` and set a unique `POSTGRES_PASSWORD` and your public `PUBLIC_URL`.
The remaining service settings are optional and can be added as needed.

When the command finishes, open the address in `PUBLIC_URL` (by default,
<http://localhost:3000>).

On first start, Savedly:

- Creates the database tables.
- Generates its signing and encryption secrets and stores them in the `secrets` volume.
- Stores uploaded files on local disk in the `files` volume.
- Uses the built-in Postgres (pgvector) for search.

None of this needs any configuration.

## Create your admin account

1. Open <http://localhost:3000>. The sign-in page shows **Create your admin account**.
2. Enter your name, email and a password of at least 8 characters, then click **Create admin account**.

The first account on a new install becomes the admin. Accounts created after it are regular users. To stop anyone else from signing up, go to **Admin** > **Configuration** and turn off **New signups**.

## Add your AI key

1. Go to **Settings** > **AI**.
2. Add a key for your provider and choose a model for each role.

Each person on the install adds their own key. To make search by meaning work for everyone before they add a key, set an instance-wide embeddings key; see [Connect services](#connect-services).

## Connect services

Everything works with the defaults. To change a service, go to **Admin** > **Infrastructure**. Each section has **Save** and, where it applies, **Test connection**, which checks your values before you save them.

| Section | Default | Change it to use |
|---|---|---|
| File storage | Local disk | Any S3-compatible store: Cloudflare R2, AWS S3, MinIO |
| Vector store | Built-in Postgres (pgvector) | Upstash Vector or Pinecone |
| Email | Off | Any SMTP server |
| Embeddings | None (each person's own key) | One key for the whole install |
| Sign in with Google / GitHub | Off | Your own OAuth app (the page shows the callback URL to register) |

Notes:

- **S3-compatible storage:** the bucket must allow public reads for its public URL, the same as an R2 public bucket. Files already on local disk stay there; only new uploads go to the bucket.
- **Vector store:** switching doesn't move existing vectors. Memories saved before the switch need re-processing to be found by meaning.
- **Email:** without it, everything else works; welcome emails and share invites are skipped.

### Configure with environment variables instead

You can set any of these in a `.env` file next to `docker-compose.yml`. A value set this way always wins, and the Infrastructure page shows it as **Set by environment**.

```sh
# File storage (S3-compatible)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=BUCKET_NAME
S3_ACCESS_KEY_ID=ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=SECRET_ACCESS_KEY
S3_PUBLIC_URL=https://files.example.com
S3_FORCE_PATH_STYLE=false

# Vector store
VECTOR_STORE_PROVIDER=upstash
UPSTASH_VECTOR_REST_URL=UPSTASH_URL
UPSTASH_VECTOR_REST_TOKEN=UPSTASH_TOKEN
# or Pinecone (a serverless index, 1536 dimensions, cosine):
# VECTOR_STORE_PROVIDER=pinecone
# PINECONE_API_KEY=PINECONE_API_KEY
# PINECONE_INDEX_HOST=PINECONE_INDEX_HOST

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=SMTP_USERNAME
SMTP_PASSWORD=SMTP_PASSWORD
SMTP_FROM_ADDRESS=noreply@example.com
SMTP_FROM_NAME=Savedly

# Embeddings for the whole install
EMBEDDINGS_PROVIDER=openai
EMBEDDINGS_API_KEY=EMBEDDINGS_API_KEY
EMBEDDINGS_MODEL=text-embedding-3-small

# Sign in with Google / GitHub
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID=GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET
```

Replace each uppercase placeholder with your own value. After you change `.env`, run `docker compose up -d` to apply it.

## Run it on your own domain

By default, Savedly expects to be opened at `http://localhost:3000`. To serve it from a domain with HTTPS, put a reverse proxy in front of it. This example uses [Caddy](https://caddyserver.com/), which gets certificates automatically.

1. Point your domain's DNS at the server.
2. Add these lines to `.env`, replacing `savedly.example.com` with your domain:

   ```sh
   PUBLIC_URL=https://savedly.example.com
   TRUST_PROXY=2
   ```

   `TRUST_PROXY=2` tells the API that two proxies (Caddy and the app's own) sit in front of it, so it records visitors' real addresses.
3. Create a `Caddyfile`:

   ```
   savedly.example.com {
       reverse_proxy localhost:3000
   }
   ```

4. Start Caddy, then run `docker compose up -d` to apply the new URL.

If you use Google or GitHub sign-in, register the new callback URLs shown on the Infrastructure page.

## Back up your data

Your library lives in three places: the database, the uploaded files, and the secrets volume, which holds the key that encrypts saved API keys.

### Download a backup from the admin page

1. Open **Admin**. The **Keep it safe** card is on the overview.
2. To be able to restore saved API keys and calendar connections, select **Include the encryption key**. The archive then contains that key, so store it somewhere private.
3. Click **Download backup**.

The archive, `savedly-backup-<date>.tar.gz`, contains `database.sql`, a `files` folder, a `README.txt`, and `secrets.json` if you included the key. If your files are in S3-compatible storage, they are not in the archive; back them up in the bucket.

### Back up from the command line

Run the following commands from the `savedly` directory:

```sh
docker compose exec -T db pg_dump -U saveforlatter saveforlatter > database.sql
docker run --rm -v saveforlatter_files:/files -v "$PWD":/backup alpine tar czf /backup/files.tar.gz -C /files .
```

Also keep a copy of the `saveforlatter_secrets` volume.

### Restore from a backup

Start from a fresh install on the new machine. Extract the downloaded archive in the `savedly` directory, then run the following commands. They replace whatever that install holds:

```sh
tar xzf savedly-backup-<date>.tar.gz
docker compose stop server
docker compose exec -T db psql -U saveforlatter -d saveforlatter -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
docker compose exec -T db psql -U saveforlatter -d saveforlatter < database.sql
docker run --rm -v saveforlatter_files:/files -v "$PWD/files":/backup alpine sh -c 'rm -rf /files/* && cp -a /backup/. /files/'
```

If the archive has a `secrets.json`, put it back before you start the server, so saved API keys can be read:

```sh
docker run --rm -v saveforlatter_secrets:/secrets -v "$PWD":/backup alpine sh -c 'cp /backup/secrets.json /secrets/secrets.json && chown 1001:1001 /secrets/secrets.json && chmod 600 /secrets/secrets.json'
docker compose start server
```

Without the original key, the install still works, but saved API keys and calendar connections must be entered again.

If you backed up from the command line, restore `files.tar.gz` with `tar xzf` into the `saveforlatter_files` volume in place of the `cp` step.

## Upgrade

To upgrade to the latest version, run the following commands from the `savedly` directory:

```sh
git pull
docker compose up -d --build
```

Database changes apply automatically when the new version starts. Back up first; see [Back up your data](#back-up-your-data).

## Run the hosted API

The hosted version of Savedly runs the API by itself, with managed
Postgres and Redis. That setup isn't a self-hosted install; see
[Deploy the API to AWS](./DEPLOY_AWS.md).

## Troubleshoot

- **Can't sign in over `http://` on another device:** open the app at the address in `PUBLIC_URL`. Sign-in cookies are tied to that address.
- **Saved links aren't summarized:** check that your AI key is set in **Settings** > **AI**. Saving still works without one; the item just isn't enriched.
- **See what's happening:** run `docker compose logs -f server`.

## What's next

- [Getting started](./GETTING_STARTED.md): run Savedly from source to develop it.
- [Architecture](./ARCHITECTURE.md): how the pieces fit together.
