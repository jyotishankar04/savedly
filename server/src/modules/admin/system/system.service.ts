import { readFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { count, sql } from "drizzle-orm";
import { db } from "../../../db";
import { memories, users } from "../../../db/schema";
import { AiRole } from "../../../db/enums";
import { env } from "../../../config/env";
import { getSection } from "../../instance-settings/instance-settings.service";
import { getOAuthCredentials } from "../../auth/oauth-config";
import { platformCredential } from "../../ai/ai.providers";

function appVersion(): string | null {
  try {
    return JSON.parse(readFileSync(resolve("package.json"), "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/** Total bytes under a directory (the local-disk file store). Missing dir = 0. */
async function directoryBytes(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(path);
    else if (entry.isFile()) total += (await stat(path)).size;
  }
  return total;
}

/**
 * What a self-hosted operator needs at a glance: version, how big the data
 * is, and which services are set up. Only served on a self-hosted install —
 * see system.routes.ts.
 */
export async function getSystemStatus() {
  const [[userCount], [memoryCount], dbSize, storage, vector, email, embeddings, google, github] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(memories),
    db.execute(sql`select pg_database_size(current_database()) as bytes`),
    getSection("storage"),
    getSection("vector"),
    getSection("email"),
    getSection("embeddings"),
    getOAuthCredentials("google"),
    getOAuthCredentials("github"),
  ]);

  const localStorage = storage.driver !== "s3";
  return {
    version: appVersion(),
    users: userCount.n,
    memories: memoryCount.n,
    databaseBytes: Number((dbSize.rows[0] as { bytes: string | number }).bytes),
    // Only measurable when files are on this server's disk.
    filesBytes: localStorage ? await directoryBytes(resolve(env.FILES_DIR)) : null,
    services: {
      storage: localStorage ? "Local disk" : "S3-compatible",
      vectorStore: vector.provider === "upstash" ? "Upstash Vector" : "Built-in Postgres",
      email: !!email.enabled,
      embeddingsKey: !!embeddings.apiKey,
      sharedAi: !!platformCredential(AiRole.REASONING),
      googleSignIn: !!google,
      githubSignIn: !!github,
    },
  };
}
