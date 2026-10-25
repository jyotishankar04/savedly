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

export const PRESIGN_EXPIRES_SECONDS = 300; // 5 minutes
export const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$/i;
