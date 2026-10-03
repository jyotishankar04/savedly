# Deploy the API to AWS

This page is for a maintainer who runs the hosted SaveForLatter API. It sets up one small AWS instance and automatic deploys from the `prod-server` branch. When you finish, `https://api.saveforlatter.tech` serves the API, and a merge into `prod-server` ships a new version.

This page doesn't cover the web client (it's deployed separately) or a self-hosted install (see [Self-hosting](./SELF_HOSTING.md)).

## How it works

- The instance runs two containers: the API, and Caddy, which handles HTTPS. Postgres, Redis, the vector store and file storage are external services named in `server/.env.prod`.
- GitHub Actions builds the image and the instance pulls it, so the instance never builds. The workflow is `.github/workflows/cd.yml`, and the instance's files are in `deploy/aws/`.

## Before you begin

You need:

- An AWS account, and access to the domain's DNS.
- `server/.env.prod` filled in. Set `FRONTEND_URL` to the web app's address and `SERVER_URL` to `https://api.saveforlatter.tech`, both without a trailing slash.
- Admin access to the GitHub repository.

> [!NOTE]
> Check the Billing console to see whether your account's free tier covers a `t3.small` instance and a public IPv4 address. Outside the free tier, both are billed.

## 1. Create the instance

1. In the EC2 console, launch an instance:
   - **Image:** Ubuntu Server 24.04 LTS, 64-bit (x86)
   - **Type:** `t3.small`
   - **Storage:** 20 GB gp3
   - **Key pair:** create one, and keep the private key file
   - **Security group:** allow inbound ports 22, 80 and 443 from anywhere
2. Allocate an Elastic IP and associate it with the instance.
3. In your DNS provider, add an `A` record: name `api`, value the Elastic IP.

## 2. Set up the instance

Replace `KEY_FILE` with the path to the key pair's private key, and `ELASTIC_IP` with the instance's address.

1. Connect and run the setup script. It installs Docker, adds swap and creates `/opt/saveforlatter`:

   ```sh
   ssh -i KEY_FILE ubuntu@ELASTIC_IP
   curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/deploy/aws/bootstrap.sh | bash
   exit
   ```

2. From your computer, copy the environment file to the instance:

   ```sh
   scp -i KEY_FILE server/.env.prod ubuntu@ELASTIC_IP:/opt/saveforlatter/.env.prod
   ```

## 3. Connect GitHub

In the repository, go to **Settings** > **Secrets and variables** > **Actions**, and add:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | The Elastic IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | The contents of the key pair's private key file |

## 4. Deploy

Merging into `prod-server` deploys. See [Release process](./RELEASE_PROCESS.md) for how a release PR is opened.

The first deploy needs one extra step, because the image package starts out private and the instance can't pull it:

1. Merge the release PR into `prod-server`. The `build` job pushes the image; the `deploy` job fails at the pull.
2. On GitHub, open the `saveforlatter-server` package and set its visibility to **Public**.
3. In **Actions** > **Deploy API**, click **Re-run failed jobs**.

To confirm the deploy, run the following command. It prints `200`:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://api.saveforlatter.tech/api/v1/health
```

Caddy gets the HTTPS certificate by itself on the first start. Database changes apply when the new version starts.

## 5. Update the sign-in and payment settings

These services call the API by its address. Point each at `https://api.saveforlatter.tech`:

- Google and GitHub OAuth apps: the callback URLs.
- Dodo Payments: the webhook URL.

## Roll back

1. In **Actions** > **Deploy API**, click **Run workflow**.
2. Choose the `prod-server` branch.
3. In **image_tag**, enter the full commit SHA of the version to return to.

The workflow skips the build and restarts the API on that image. A rollback doesn't undo database changes.

## Change a setting

To change an environment variable, edit `/opt/saveforlatter/.env.prod` on the instance, then run the following commands:

```sh
cd /opt/saveforlatter
docker compose up -d --force-recreate server
```

To restart everything by hand, pull first. A plain `docker compose up -d` uses the instance's copy of the `latest` image, which can be older than the version the last deploy started:

```sh
docker compose pull && docker compose up -d
```

## Measure latency

To see how long the API's calls to Postgres, Redis and Pinecone take from the instance, copy `deploy/aws/latency-probe.sh` to the instance and run it:

```sh
scp -i KEY_FILE deploy/aws/latency-probe.sh ubuntu@ELASTIC_IP:/opt/saveforlatter/
ssh -i KEY_FILE ubuntu@ELASTIC_IP 'bash /opt/saveforlatter/latency-probe.sh'
```

It prints timings only. A Postgres `select 1` above about 20 ms means the database is in a distant region; every API request makes several such round trips.

## Troubleshoot

- **See what's happening:** on the instance, run `cd /opt/saveforlatter && docker compose logs -f server`.
- **The deploy job fails at "Pull the image":** the package is still private. See [Deploy](#4-deploy).
- **The browser shows a certificate error:** Caddy couldn't get a certificate. Check that the `api` DNS record points at the Elastic IP and that ports 80 and 443 are open, then run `docker compose logs caddy`.
- **Sign-in fails:** the OAuth callback URLs still point at another address.
- **Saved items stop being summarized:** the background workers use Redis. Check the Redis provider's usage; a free plan's request quota can run out.

## Later: tighten security

This setup is deliberately simple. After the first rollout, these are the next steps:

- Put Cloudflare (free plan) in front of the API for DDoS protection, firewall rules and rate limits, and allow port 443 only from Cloudflare's addresses.
- Limit port 22 to known addresses, or replace SSH deploys with AWS Systems Manager.
- Deploy as a separate user that can only restart the containers.
- Add a billing budget alert.
