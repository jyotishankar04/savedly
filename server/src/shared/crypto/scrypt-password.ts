import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

// Node's only password-grade KDF, and it needs no native dependency —
// bcrypt and argon2 both do, and this codebase has none. Shared by share
// passwords, the vault PIN and email + password accounts (self-hosted
// installs) — all hashed rarely enough that "no new native build step" is
// the right trade.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LEN = 32;
const SALT_LEN = 32;

// 128 * N * r is exactly 32 MiB, which is Node's *default* maxmem — scrypt
// throws if it needs the whole ceiling, so this has to be raised explicitly.
const MAX_MEM = 64 * 1024 * 1024;

const SCHEME = "scrypt";

function options(): crypto.ScryptOptions {
  return { N, r: R, p: P, maxmem: MAX_MEM };
}

/** Self-describing so the cost parameters can be raised later without a flag day. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scrypt(plain, salt, KEY_LEN, options());
  return [SCHEME, N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/**
 * Always does the full derivation, including when nothing is set yet —
 * otherwise "nothing configured" would return in microseconds while a
 * wrong guess took ~100ms, which is enough to probe whether a share/vault
 * is protected at all without ever guessing correctly.
 */
export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  const parsed = stored ? parse(stored) : null;

  if (!parsed) {
    // Burn equivalent work against a throwaway salt, then fail.
    await scrypt(plain, crypto.randomBytes(SALT_LEN), KEY_LEN, options());
    return false;
  }

  const derived = await scrypt(plain, parsed.salt, parsed.key.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAX_MEM,
  });

  return derived.length === parsed.key.length && crypto.timingSafeEqual(derived, parsed.key);
}

interface ParsedHash {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

function parse(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) return null;

  const [, n, r, p, salt, key] = parts;
  const parsed = {
    n: Number(n),
    r: Number(r),
    p: Number(p),
    salt: Buffer.from(salt, "base64url"),
    key: Buffer.from(key, "base64url"),
  };

  if (!Number.isFinite(parsed.n) || !Number.isFinite(parsed.r) || !Number.isFinite(parsed.p)) return null;
  if (parsed.salt.length === 0 || parsed.key.length === 0) return null;

  return parsed;
}
