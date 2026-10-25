import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

// Generated on first self-hosted boot into SECRETS_DIR/secrets.json and reloaded after, so sessions
// and encrypted keys survive restarts. An env var wins.
const GENERATED_SECRETS = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "SHARE_TOKEN_SECRET",
  "VAULT_TOKEN_SECRET",
  "CALENDAR_STATE_SECRET",
  "TOKEN_ENCRYPTION_KEY",
] as const;

function generate(key: (typeof GENERATED_SECRETS)[number]): string {
  // token-cipher.ts expects exactly 32 raw bytes, base64-encoded.
  if (key === "TOKEN_ENCRYPTION_KEY") return randomBytes(32).toString("base64");
  return randomBytes(48).toString("base64url");
}

/** Runs before env.ts parses, only when SELF_HOSTED=true; hosted production must set secrets explicitly. */
export function loadSelfHostSecrets(): void {
  if (process.env.SELF_HOSTED !== "true") return;

  const dir = process.env.SECRETS_DIR ?? "./.secrets";
  const file = join(dir, "secrets.json");
  const stored: Record<string, string> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

  let changed = false;
  for (const key of GENERATED_SECRETS) {
    if (process.env[key]) continue;
    if (!stored[key]) {
      stored[key] = generate(key);
      changed = true;
    }
    process.env[key] = stored[key];
  }

  if (changed) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(file, JSON.stringify(stored, null, 2), { mode: 0o600 });
  }
}
