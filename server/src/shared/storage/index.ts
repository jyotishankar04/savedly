import crypto from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import { getSection, settingsVersion } from "../../modules/instance-settings/instance-settings.service";

// Where uploaded files live. Two drivers behind one interface:
//
// - "s3": any S3-compatible store (Cloudflare R2 in hosted production, AWS S3,
//   MinIO). The client PUTs straight to the store with a presigned URL; the
//   bytes never touch this server.
// - "local": a directory on disk (FILES_DIR, a Docker volume in the
//   self-hosted docker-compose.yml). The client PUTs to this server's
//   /api/v1/files/upload/:key with a short-lived signed token, and files are
//   served from /api/v1/files/:key.
//
// Keys are random UUIDs plus the original extension, so a file URL is
// unguessable in both drivers — the same "anyone with the link" model R2's
// public bucket already had.

export interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export interface StorageDriver {
  kind: "local" | "s3";
  createUpload(key: string, mimeType: string): Promise<PresignedUpload>;
  write(key: string, body: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** The storage key a file URL points at, if it's one of ours. */
  keyFromUrl(url: string): string | null;
}

const PRESIGN_EXPIRES_SECONDS = 300; // 5 minutes
export const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$/i;

// ---------------------------------------------------------------------------
// Local disk
// ---------------------------------------------------------------------------

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

const localDriver: StorageDriver = {
  kind: "local",
  async createUpload(key, mimeType) {
    const expiresAt = Date.now() + PRESIGN_EXPIRES_SECONDS * 1000;
    const query = new URLSearchParams({ e: String(expiresAt), s: signUpload(key, mimeType, expiresAt) });
    return { uploadUrl: `${localFileBase()}/upload/${key}?${query}`, fileUrl: `${localFileBase()}/${key}`, key };
  },
  async write(key, body, mimeType) {
    await mkdir(filesDir, { recursive: true });
    await writeFile(localPath(key), body);
    await writeFile(localMetaPath(key), JSON.stringify({ mimeType }));
  },
  async read(key) {
    return readFile(localPath(key));
  },
  async delete(key) {
    await rm(localPath(key), { force: true });
    await rm(localMetaPath(key), { force: true });
  },
  keyFromUrl(url) {
    const prefix = `${localFileBase()}/`;
    if (!url.startsWith(prefix)) return null;
    const key = url.slice(prefix.length);
    return STORAGE_KEY_PATTERN.test(key) ? key : null;
  },
};

// ---------------------------------------------------------------------------
// S3-compatible
// ---------------------------------------------------------------------------

export interface S3Settings {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle?: boolean;
}

export function createS3Driver(settings: S3Settings): StorageDriver {
  const client = new S3Client({
    region: settings.region || "auto",
    endpoint: settings.endpoint || undefined,
    forcePathStyle: !!settings.forcePathStyle,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    // The SDK defaults to signing a flexible-checksum header on every request.
    // For a presigned URL that's computed against an empty body (the real
    // bytes don't exist yet at sign time), so the client's actual PUT never
    // matches it and R2 rejects the upload with 403. PutObject doesn't need
    // this, so only compute a checksum when an API explicitly requires one.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  const publicUrl = settings.publicUrl.replace(/\/$/, "");

  return {
    kind: "s3",
    async createUpload(key, mimeType) {
      const command = new PutObjectCommand({ Bucket: settings.bucket, Key: key, ContentType: mimeType });
      // signableHeaders forces content-type into the signature (it isn't
      // signed by default — only x-amz-* headers are) — without this, the
      // store accepts a PUT with any Content-Type, silently ignoring ours.
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGN_EXPIRES_SECONDS,
        signableHeaders: new Set(["content-type"]),
      });
      return { uploadUrl, fileUrl: `${publicUrl}/${key}`, key };
    },
    async write(key, body, mimeType) {
      await client.send(new PutObjectCommand({ Bucket: settings.bucket, Key: key, Body: body, ContentType: mimeType }));
    },
    async read(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: settings.bucket, Key: key }));
      return Buffer.from(await res.Body!.transformToByteArray());
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
    },
    keyFromUrl(url) {
      const prefix = `${publicUrl}/`;
      return url.startsWith(prefix) ? url.slice(prefix.length) : null;
    },
  };
}

// ---------------------------------------------------------------------------
// The active driver — rebuilt whenever an admin saves new storage settings.
// ---------------------------------------------------------------------------

let active: { version: number; driver: StorageDriver } | null = null;

export async function getStorage(): Promise<StorageDriver> {
  if (active && active.version === settingsVersion()) return active.driver;
  const settings = await getSection("storage");
  const driver = settings.driver === "s3" ? createS3Driver(settings as unknown as S3Settings) : localDriver;
  active = { version: settingsVersion(), driver };
  return driver;
}

export { localDriver };

/**
 * The bytes behind a file URL. Reads our own files straight from storage —
 * a local-disk URL like http://localhost:4000/... isn't reachable the way
 * a public R2 URL is — and falls back to a plain HTTP fetch for anything else.
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
 * An image URL an AI provider can actually open. Local-disk files live on a
 * URL only this server can reach, so they're inlined as a data: URL;
 * everything else (a public R2 URL, a web page's og:image) passes through.
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
