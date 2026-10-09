import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Readable } from "node:stream";
import { create as createTar } from "tar";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/app-error";
import { getSection } from "../../instance-settings/instance-settings.service";

// A self-hosted install's backup as one download: the database, the uploaded
// files when they live on this server's disk, and optionally the secrets
// file. Built in a temporary folder and streamed out, so a large library is
// never held in memory.

// One at a time: a dump is heavy, and two would fight over the same disk.
let running = false;

/** pg_dump reads its connection from PG* variables, which keeps the password out of the process list. */
function pgEnv(): NodeJS.ProcessEnv {
  const url = new URL(env.DATABASE_URL);
  const sslmode = url.searchParams.get("sslmode");
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    ...(sslmode ? { PGSSLMODE: sslmode } : {}),
  };
}

function dumpDatabase(file: string): Promise<void> {
  return new Promise((done, fail) => {
    // Plain SQL without owners or grants, so it restores under any database user.
    const child = spawn("pg_dump", ["--no-owner", "--no-privileges", "--file", file], { env: pgEnv(), stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-2000)));
    child.on("error", (err: NodeJS.ErrnoException) =>
      fail(
        err.code === "ENOENT"
          ? new AppError("This server doesn't have pg_dump installed, so it can't make a backup. See the self-hosting guide for the command-line way.", 501, "BACKUP_UNAVAILABLE")
          : err,
      ),
    );
    child.on("close", (code) =>
      code === 0 ? done() : fail(new AppError(`The database dump failed: ${stderr.trim().split("\n").pop() || `pg_dump exited with ${code}`}`, 500, "BACKUP_FAILED")),
    );
  });
}

function readme(parts: { files: boolean; s3: boolean; key: boolean }): string {
  return `Savedly backup, made ${new Date().toISOString()}

What is in this archive
  database.sql   Every account, saved item and setting.
${parts.files ? "  files/         Uploaded images and PDFs.\n" : ""}${parts.key ? "  secrets.json   The keys this install generated, including the one that\n                 encrypts saved API keys. Keep this archive private.\n" : ""}
What is not
${parts.s3 ? "  Uploaded files. They are in your S3-compatible bucket; back that up there.\n" : ""}${parts.key ? "" : "  The encryption key. Without it, saved API keys and calendar connections\n  can't be read after a restore and must be entered again. It lives in the\n  secrets volume; keep a copy of that separately.\n"}  The job queue. It starts empty after a restore.

To restore
  Start from a fresh install on the new machine, then follow "Restore from a
  backup" in docs/SELF_HOSTING.md, using the files from this archive.
`;
}

export interface Backup {
  filename: string;
  stream: Readable;
  /** Removes the temporary folder. Call it when the download ends, however it ends. */
  cleanup: () => Promise<void>;
}

export async function createBackup(options: { includeKey: boolean }): Promise<Backup> {
  if (running) throw new AppError("A backup is already being made. Wait for it to finish.", 409, "BACKUP_RUNNING");
  running = true;
  const staging = await mkdtemp(join(tmpdir(), "savedly-backup-"));
  const cleanup = async () => {
    running = false;
    await rm(staging, { recursive: true, force: true });
  };

  try {
    await dumpDatabase(join(staging, "database.sql"));
    const entries = ["database.sql", "README.txt"];

    const s3 = (await getSection("storage")).driver === "s3";
    const filesDir = resolve(env.FILES_DIR);
    const files = !s3 && existsSync(filesDir);
    if (files) {
      // A link, followed when the archive is written: nothing is copied first.
      await symlink(filesDir, join(staging, "files"), "dir");
      entries.push("files");
    }

    const secretsFile = join(resolve(env.SECRETS_DIR), "secrets.json");
    const key = options.includeKey && existsSync(secretsFile);
    if (key) {
      await copyFile(secretsFile, join(staging, "secrets.json"));
      entries.push("secrets.json");
    }

    await writeFile(join(staging, "README.txt"), readme({ files, s3, key }));

    const stream = createTar({ gzip: true, cwd: staging, follow: true, portable: true }, entries) as unknown as Readable;
    return { filename: `savedly-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`, stream, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
