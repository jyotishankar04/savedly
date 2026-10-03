# Deploy the API to AWS

This page is for a maintainer who runs the hosted SaveForLatter API. It sets up one small AWS instance behind Cloudflare, and automatic deploys from the `prod-server` branch. When you finish, `https://api.saveforlatter.tech` serves the API and a merge into `prod-server` ships a new version.

This page doesn't cover the web client (it's deployed separately) or a self-hosted install (see [Self-hosting](./SELF_HOSTING.md)).

## How it fits together

```
browser -> Cloudflare -> instance :443 (Caddy) -> API container
GitHub Actions -> builds the image -> GitHub Container Registry -> instance pulls it
```

- The instance runs two containers: the API and Caddy. Postgres, Redis, the vector store and file storage are external services named in `server/.env.prod`.
- GitHub Actions builds the image, so the instance never builds. The workflow is `.github/workflows/cd.yml`.
- Cloudflare sits in front. The instance accepts HTTPS only from Cloudflare.

The files for the instance are in `deploy/aws/`.

## Before you begin

You need:

- An AWS account, and the domain's DNS on Cloudflare (the free plan is enough).
- `server/.env.prod` filled in. Set `FRONTEND_URL` to the web app's address and `SERVER_URL` to `https://api.saveforlatter.tech`, both without a trailing slash.
- Admin access to the GitHub repository.

> [!NOTE]
> Check the Billing console to see whether your account's free tier covers a `t4g.small` instance and a public IPv4 address. Outside the free tier, both are billed.

## Create the instance

1. In the EC2 console, launch an instance:
   - **Image:** Ubuntu Server 24.04 LTS, 64-bit (Arm)
   - **Type:** `t4g.small`
   - **Storage:** 20 GB gp3
   - **Key pair:** create one, and keep the private key
2. Create a security group with these inbound rules:

   | Port | Source | Why |
   | --- | --- | --- |
   | 22 | Anywhere | GitHub Actions deploys over SSH. Password login is turned off; only keys work. |
   | 443 | [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) | Visitors reach the API only through Cloudflare. |

3. Allocate an Elastic IP and associate it with the instance.
4. In **Billing** > **Budgets**, create a budget with an email alert.

## Set up the instance

1. Connect as the default user:

   ```sh
   ssh -i KEY_FILE ubuntu@ELASTIC_IP
   ```

2. Run the setup script. It installs Docker, adds swap, creates a `deploy` user and creates `/opt/saveforlatter`:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/deploy/aws/bootstrap.sh | bash
   ```

3. On your own computer, create a key pair for deploys:

   ```sh
   ssh-keygen -t ed25519 -f saveforlatter-deploy -N "" -C "github-actions-deploy"
   ```

4. Add the public key to the `deploy` user. Run this on your computer:

   ```sh
   cat saveforlatter-deploy.pub | ssh -i KEY_FILE ubuntu@ELASTIC_IP "sudo tee -a /home/deploy/.ssh/authorized_keys"
   ```

5. Copy the environment file to the instance:

   ```sh
   scp -i saveforlatter-deploy server/.env.prod deploy@ELASTIC_IP:/opt/saveforlatter/.env.prod
   ssh -i saveforlatter-deploy deploy@ELASTIC_IP "chmod 600 /opt/saveforlatter/.env.prod"
   ```

Replace `KEY_FILE` with the path to the EC2 key pair's private key, and `ELASTIC_IP` with the instance's address.

## Set up Cloudflare

1. In **DNS**, add an `A` record: name `api`, content the Elastic IP, **Proxied**.
2. Leave the web client's records as **DNS only**.
3. In **SSL/TLS** > **Overview**, set the mode to **Full (strict)**.
4. In **SSL/TLS** > **Origin Server**, create a certificate for `api.saveforlatter.tech`. Save the certificate as `origin.pem` and the private key as `origin.key`.
5. Copy both to the instance:

   ```sh
   scp -i saveforlatter-deploy origin.pem origin.key deploy@ELASTIC_IP:/opt/saveforlatter/certs/
   ssh -i saveforlatter-deploy deploy@ELASTIC_IP "chmod 600 /opt/saveforlatter/certs/origin.key"
   ```

6. In **Security**, turn on **Bot Fight Mode** and the free managed rules.
7. Optional: add a rate limiting rule for requests whose path starts with `/api/v1/auth/`.

> [!NOTE]
> Cloudflare's free plan rejects request bodies over 100 MB. An upload at the very top of the largest plan's file limit can fail for that reason.

## Connect GitHub

1. In the repository, go to **Settings** > **Secrets and variables** > **Actions**, and add:

   | Secret | Value |
   | --- | --- |
   | `EC2_HOST` | The Elastic IP |
   | `EC2_USER` | `deploy` |
   | `EC2_SSH_KEY` | The contents of `saveforlatter-deploy` (the private key) |

2. After the first deploy builds the image, open the `saveforlatter-server` package on GitHub and set its visibility to **Public**. The instance pulls the image without signing in.

## Deploy

Merging into `prod-server` deploys. See [Release process](./RELEASE_PROCESS.md) for how a release PR is opened.

For the first deploy, the image doesn't exist yet and the package is still private, so the pull on the instance fails once:

1. Merge the release PR into `prod-server`. The `build` job pushes the image; the `deploy` job fails at the pull.
2. Set the package's visibility to **Public**.
3. In **Actions** > **Deploy API**, click **Re-run failed jobs**.

To confirm the deploy, run the following command. It prints `200`:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://api.saveforlatter.tech/api/v1/health
```

Database changes apply when the new version starts.

## Update the sign-in and payment settings

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

## Troubleshoot

- **See what's happening:** on the instance, run `cd /opt/saveforlatter && docker compose logs -f server`.
- **The site shows a Cloudflare 521 or 522 error:** the instance isn't answering. Check that both containers are running with `docker compose ps`, and that the security group allows port 443 from Cloudflare's ranges.
- **The site shows a Cloudflare 526 error:** the origin certificate is missing or doesn't match. Check `origin.pem` and `origin.key` in `/opt/saveforlatter/certs`.
- **The deploy job fails at "Pull the image":** the package is still private. See [Deploy](#deploy).
- **Sign-in fails after the move:** the OAuth callback URLs still point at the old address.
- **Saved items stop being summarized:** the background workers use Redis. Check the Redis provider's usage; a free plan's request quota can run out.
