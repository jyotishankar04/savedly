import { readFile } from "node:fs/promises";
import { getSection, settingsVersion } from "../instance-settings/instance-settings.service";
import { localDriver, localMetaPath } from "./local-driver";
import { createS3Driver, type S3Settings } from "./s3-driver";
import type { StorageDriver } from "./storage.types";

// Storage: storage.types.ts (the interface), local-driver.ts, s3-driver.ts; everything other code
// needs is exported here.
export { PRESIGN_EXPIRES_SECONDS, STORAGE_KEY_PATTERN, type PresignedUpload, type StorageDriver } from "./storage.types";
export { LocalStorageDriver, localDriver, localMetaPath, verifyLocalUploadToken } from "./local-driver";
export { S3StorageDriver, createS3Driver, type S3Settings } from "./s3-driver";

// The active driver: rebuilt whenever an admin saves storage settings.

let active: { version: number; driver: StorageDriver } | null = null;

export async function getStorage(): Promise<StorageDriver> {
  if (active && active.version === settingsVersion()) return active.driver;
  const settings = await getSection("storage");
  const driver = settings.driver === "s3" ? createS3Driver(settings as unknown as S3Settings) : localDriver;
  active = { version: settingsVersion(), driver };
  return driver;
}

/**
 * The bytes behind a file URL: our own files are read straight from storage (a local-disk URL isn't
 * reachable like a public R2 URL), anything else over HTTP.
 */
export async function readFileUrl(url: string): Promise<Buffer> {
  const storage = await getStorage();
  const key = storage.keyFromUrl(url);
  if (key) return storage.read(key);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * An image URL an AI provider can open: local-disk files are inlined as a data: URL (only this
 * server reaches them); everything else passes through.
 */
export async function toModelImageUrl(url: string, mimeType?: string): Promise<string> {
  const storage = await getStorage();
  if (storage.kind !== "local" || !storage.keyFromUrl(url)) return url;
  const key = storage.keyFromUrl(url)!;
  let type = mimeType;
  if (!type) {
    try {
      type = JSON.parse(await readFile(localMetaPath(key), "utf8")).mimeType;
    } catch {
      type = "image/png";
    }
  }
  const bytes = await storage.read(key);
  return `data:${type};base64,${bytes.toString("base64")}`;
}
