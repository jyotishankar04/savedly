// Where uploaded files live, behind one interface: "s3" (any S3-compatible store; the client PUTs
// straight to it with a presigned URL) and "local" (a directory on disk; the client PUTs to
// /api/v1/files/upload/:key with a signed token, files served from /api/v1/files/:key). Keys are
// random UUIDs plus the extension, so URLs are unguessable in both: the "anyone with the link"
// model.

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
