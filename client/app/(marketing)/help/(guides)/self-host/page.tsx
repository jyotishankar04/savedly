import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { CopyCommand } from "@/components/copy-command";
import { GITHUB_URL } from "@/lib/open-source";

export const metadata: Metadata = {
  title: "Self-host SaveForLatter · Help · SaveForLatter",
  description:
    "Run your own SaveForLatter with one command: install, create the admin account, connect storage, email and sign-in, back up and upgrade.",
};

const INSTALL = "curl -fsSL https://raw.githubusercontent.com/jyotishankar04/saveforlatter/main/install.sh | sh";
const MANUAL = `git clone ${GITHUB_URL}.git
cd saveforlatter
docker compose up -d`;

const ENV_EXAMPLE = `# File storage (S3-compatible: Cloudflare R2, AWS S3, MinIO)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=BUCKET_NAME
S3_ACCESS_KEY_ID=ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=SECRET_ACCESS_KEY
S3_PUBLIC_URL=https://files.example.com

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=SMTP_USERNAME
SMTP_PASSWORD=SMTP_PASSWORD
SMTP_FROM_ADDRESS=noreply@example.com

# One embeddings key for the whole install
EMBEDDINGS_PROVIDER=openai
EMBEDDINGS_API_KEY=EMBEDDINGS_API_KEY

# Sign in with Google / GitHub
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID=GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET`;

const DOMAIN_ENV = `PUBLIC_URL=https://saveforlatter.example.com
TRUST_PROXY=2`;

const CADDYFILE = `saveforlatter.example.com {
    reverse_proxy localhost:3000
}`;

const BACKUP = `docker compose exec -T db pg_dump -U saveforlatter saveforlatter > saveforlatter-db.sql
docker run --rm -v saveforlatter_files:/files -v "$PWD":/backup alpine \\
  tar czf /backup/saveforlatter-files.tar.gz -C /files .`;

const UPGRADE = `git pull
docker compose up -d --build`;

const SERVICES = [
  { name: "File storage", fallback: "Local disk", options: "Cloudflare R2, AWS S3, MinIO or any S3-compatible store" },
  { name: "Vector store", fallback: "Built-in Postgres (pgvector)", options: "Upstash Vector" },
  { name: "Email", fallback: "Off", options: "Any SMTP server" },
  { name: "Embeddings", fallback: "Each person's own key", options: "One key for the whole install" },
  { name: "Sign in with Google / GitHub", fallback: "Off (email and password works)", options: "Your own OAuth app" },
];

const SECTIONS = [
  { id: "before-you-begin", title: "Before you begin" },
  { id: "install", title: "Install" },
  { id: "admin", title: "Create your admin account" },
  { id: "ai-key", title: "Add your AI key" },
  { id: "configure", title: "Connect services" },
  { id: "domain", title: "Run it on your own domain" },
  { id: "backup", title: "Back up your data" },
  { id: "upgrade", title: "Upgrade" },
  { id: "troubleshoot", title: "Troubleshoot" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

const code = "rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground";

export default function SelfHostGuidePage() {
  return (
    <article className="max-w-3xl">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Help Center
        </Link>
        <span aria-hidden>/</span>
        <span>Self-hosting</span>
      </nav>

      <h1 className="mt-5 text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] text-balance">Self-host SaveForLatter</h1>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-[60ch]">
        Run your own SaveForLatter on a computer or server you control. It&apos;s free, every feature works, and nothing is limited. You need
        basic comfort with a terminal.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href="#install"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Install now
          <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          View on GitHub
        </a>
      </div>

      <nav aria-label="On this page" className="mt-10 rounded-2xl border border-border p-5">
        <p className="text-sm font-medium text-foreground">On this page</p>
        <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
                <span className="tabular-nums">{i + 1}.</span> {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-14 space-y-14">
        <Section id="before-you-begin" title="Before you begin">
          <p>You need:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Docker
              </a>{" "}
              with the Compose plugin (<code className={code}>docker compose version</code> prints a version).
            </li>
            <li>
              <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Git
              </a>
              .
            </li>
            <li>About 2 GB of free memory, and a few GB of disk for your library.</li>
            <li>
              An API key from an AI provider (OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, or any OpenAI-compatible server). SaveForLatter
              uses it to read, summarize and tag what you save.
            </li>
          </ul>
        </Section>

        <Section id="install" title="Install">
          <p>Run the installer. It clones the repository into a folder named saveforlatter and starts it:</p>
          <CopyCommand command={INSTALL} />
          <p>To install by hand instead, run the following commands:</p>
          <CopyCommand command={MANUAL} />
          <p>
            The first run builds the images and takes a few minutes. When it finishes, open{" "}
            <code className={code}>http://localhost:3000</code>.
          </p>
          <p>
            On first start SaveForLatter creates its database tables, generates its signing and encryption secrets, stores uploads on local disk,
            and uses the built-in Postgres for search. <strong>None of this needs configuration.</strong>
          </p>
        </Section>

        <Section id="admin" title="Create your admin account">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Open <code className={code}>http://localhost:3000</code>. The sign-in page shows <strong>Create your admin account</strong>.
            </li>
            <li>
              Enter your name, email and a password of at least 8 characters, then click <strong>Create admin account</strong>.
            </li>
          </ol>
          <p>
            The first account becomes the admin; accounts created after it are regular users. To stop anyone else from signing up, go to{" "}
            <strong>Admin</strong> &gt; <strong>Configuration</strong> and turn off <strong>New signups</strong>.
          </p>
        </Section>

        <Section id="ai-key" title="Add your AI key">
          <p>
            Go to <strong>Settings</strong> &gt; <strong>AI</strong>, add a key for your provider, and choose a model for each role. Each person on
            the install adds their own key. To make search by meaning work for everyone before they add one, set an instance-wide embeddings key
            (see{" "}
            <a href="#configure" className="text-primary hover:underline">
              Connect services
            </a>
            ).
          </p>
          <p>
            Not sure which models to pick?{" "}
            <Link href="/help/model-selection" className="text-primary hover:underline">
              Compare models and prices
            </Link>
            .
          </p>
        </Section>

        <Section id="configure" title="Connect services">
          <p>
            Everything works with the defaults. To change a service, go to <strong>Admin</strong> &gt; <strong>Infrastructure</strong>. Each section
            has <strong>Save</strong> and, where it applies, <strong>Test connection</strong>, which checks your values before you save them.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="bg-foreground/[0.03] text-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Service</th>
                  <th className="px-4 py-2.5 font-medium">Default</th>
                  <th className="px-4 py-2.5 font-medium">Can switch to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SERVICES.map((s) => (
                  <tr key={s.name}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-2.5">{s.fallback}</td>
                    <td className="px-4 py-2.5">{s.options}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>S3-compatible storage:</strong> the bucket must allow public reads for its public URL. Files already on local disk stay there;
              only new uploads go to the bucket.
            </li>
            <li>
              <strong>Vector store:</strong> switching doesn&apos;t move existing vectors, so memories saved before the switch need re-processing to
              be found by meaning.
            </li>
            <li>
              <strong>Email:</strong> without it, everything else works; welcome emails and share invites are skipped.
            </li>
          </ul>
          <h3 className="pt-2 text-lg font-semibold text-foreground">Configure with environment variables instead</h3>
          <p>
            You can set any of these in a <code className={code}>.env</code> file next to <code className={code}>docker-compose.yml</code>. A value
            set this way always wins, and the Infrastructure page shows it as <strong>Set by environment</strong>. Replace each uppercase placeholder
            with your own value, then run <code className={code}>docker compose up -d</code> to apply it.
          </p>
          <CopyCommand command={ENV_EXAMPLE} label=".env" />
        </Section>

        <Section id="domain" title="Run it on your own domain">
          <p>
            By default SaveForLatter expects to be opened at <code className={code}>http://localhost:3000</code>. To serve it from a domain with
            HTTPS, put a reverse proxy in front of it. This example uses{" "}
            <a href="https://caddyserver.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Caddy
            </a>
            , which gets certificates automatically.
          </p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>Point your domain&apos;s DNS at the server.</li>
            <li>
              Add these lines to <code className={code}>.env</code>, with your domain:
              <CopyCommand command={DOMAIN_ENV} label=".env" className="mt-3" />
              <span className="mt-2 block text-sm">
                <code className={code}>TRUST_PROXY=2</code> tells the API that two proxies (Caddy and the app&apos;s own) sit in front of it, so it
                records visitors&apos; real addresses.
              </span>
            </li>
            <li>
              Create a <code className={code}>Caddyfile</code>:
              <CopyCommand command={CADDYFILE} label="Caddyfile" className="mt-3" />
            </li>
            <li>
              Start Caddy, then run <code className={code}>docker compose up -d</code> to apply the new URL.
            </li>
          </ol>
          <p>If you use Google or GitHub sign-in, register the new callback URLs shown on the Infrastructure page.</p>
        </Section>

        <Section id="backup" title="Back up your data">
          <p>
            Your library lives in two places: the database and the uploaded files. To back up both, run the following commands from the
            saveforlatter folder:
          </p>
          <CopyCommand command={BACKUP} />
          <p>
            Also keep a copy of the <code className={code}>saveforlatter_secrets</code> volume. It holds the key that encrypts saved API keys;
            without it, saved keys can&apos;t be read after a restore.
          </p>
        </Section>

        <Section id="upgrade" title="Upgrade">
          <p>To upgrade to the latest version, back up first, then run the following commands from the saveforlatter folder:</p>
          <CopyCommand command={UPGRADE} />
          <p>Database changes apply automatically when the new version starts.</p>
        </Section>

        <Section id="troubleshoot" title="Troubleshoot">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Can&apos;t sign in from another device:</strong> open the app at the address in <code className={code}>PUBLIC_URL</code>.
              Sign-in cookies are tied to that address.
            </li>
            <li>
              <strong>Saved links aren&apos;t summarized:</strong> check that your AI key is set in <strong>Settings</strong> &gt;{" "}
              <strong>AI</strong>. Saving still works without one; the item just isn&apos;t enriched.
            </li>
            <li>
              <strong>See what&apos;s happening:</strong> run <code className={code}>docker compose logs -f server</code>.
            </li>
          </ul>
          <p>
            Still stuck?{" "}
            <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Open an issue on GitHub
            </a>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}
