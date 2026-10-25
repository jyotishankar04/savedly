import crypto from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env } from "../../config/env";
import { PRESIGN_EXPIRES_SECONDS, STORAGE_KEY_PATTERN, type PresignedUpload, type StorageDriver } from "./storage.types";

// A directory on disk.

const filesDir = resolve(env.FILES_DIR);
const localFileBase = () => `${env.SERVER_URL.replace(/\/$/, "")}/api/v1/files`;

// Its own HMAC key, derived from (not equal to) the access-token secret, so an
// upload token can never be read as anything else.
const uploadTokenKey = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update("local-upload-token").digest();

function signUpload(key: string, mimeType: string, expiresAt: number): string {
  return crypto.createHmac("sha256", uploadTokenKey).update(`${key}\n${mimeType}\n${expiresAt}`).digest("base64url");
}

/** Checks a local upload's `?e=&s=` token against the key and Content-Type it was issued for. */
export function verifyLocalUploadToken(key: string, mimeType: string, expiresAt: number, signature: string): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(signUpload(key, mimeType, expiresAt));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function localPath(key: string): string {
  if (!STORAGE_KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  return join(filesDir, key);
}

export function localMetaPath(key: string): string {
  return `${localPath(key)}.meta.json`;
}

export class LocalStorageDriver implements StorageDriver {
  readonly kind = "local";

  async createUpload(key: string, mimeType: string): Promise<PresignedUpload> {
    const expiresAt = Date.now() + PRESIGN_EXPIRES_SECONDS * 1000;
    const query = new URLSearchParams({ e: String(expiresAt), s: signUpload(key, mimeType, expiresAt) });
    return { uploadUrl: `${localFileBase()}/upload/${key}?${query}`, fileUrl: `${localFileBase()}/${key}`, key };
  }

  async write(key: string, body: Buffer, mimeType: string): Promise<void> {
    await mkdir(filesDir, { recursive: true });
    await writeFile(localPath(key), body);
    await writeFile(localMetaPath(key), JSON.stringify({ mimeType }));
  }

  async read(key: string): Promise<Buffer> {
    return readFile(localPath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(localPath(key), { force: true });
    await rm(localMetaPath(key), { force: true });
  }

  keyFromUrl(url: string): string | null {
    const prefix = `${localFileBase()}/`;
    if (!url.startsWith(prefix)) return null;
    const key = url.slice(prefix.length);
    return STORAGE_KEY_PATTERN.test(key) ? key : null;
  }
}

export const localDriver = new LocalStorageDriver();
