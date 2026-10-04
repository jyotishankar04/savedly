import crypto from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

// AES-256-GCM at-rest encryption for OAuth access/refresh tokens
// (calendar_connections) — reversible, unlike scrypt-password.ts's one-way
// KDF, since the server must decrypt these later to call the provider's
// API on the user's behalf. The module-scoped nullable-memo degrade shape
// below (unset key => every calendar route treats tokens as unusable
// rather than crashing) is the same pattern this codebase uses anywhere a
// missing optional secret should degrade a feature, not fail startup.
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

let key: Buffer | null | undefined;

function resolveKey(): Buffer | null {
  if (key !== undefined) return key;
  if (!env.TOKEN_ENCRYPTION_KEY) {
    key = null;
    return key;
  }
  const decoded = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");
  key = decoded.length === KEY_LENGTH ? decoded : null;
  return key;
}

export function isTokenCipherConfigured(): boolean {
  return resolveKey() !== null;
}

export function encryptToken(plaintext: string): string {
  const cipherKey = resolveKey();
  if (!cipherKey) throw new AppError("Token encryption is not configured", 503, "CALENDAR_NOT_CONFIGURED");

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, cipherKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(ciphertext: string): string {
  const cipherKey = resolveKey();
  if (!cipherKey) throw new AppError("Token encryption is not configured", 503, "CALENDAR_NOT_CONFIGURED");

  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new AppError("Malformed encrypted token", 500, "TOKEN_DECRYPT_FAILED");
  const [ivB64, authTagB64, dataB64] = parts;

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, cipherKey, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new AppError("Failed to decrypt token", 500, "TOKEN_DECRYPT_FAILED");
  }
}
