import { randomUUID } from "crypto";
import { extname } from "path";
import { getStorage, type PresignedUpload } from "../../shared/storage";
import type { PresignUploadInput } from "./upload.schema";

export type { PresignedUpload };

// The client PUTs the file to `uploadUrl` — straight to R2/S3 with the s3
// driver, or to this server's /files/upload route with the local-disk driver
// (see shared/storage). Either way the URL is signed for this exact
// Content-Type and expires in five minutes.
export async function createPresignedUpload(input: PresignUploadInput): Promise<PresignedUpload> {
  const key = `${randomUUID()}${extname(input.filename).toLowerCase()}`;
  const storage = await getStorage();
  return storage.createUpload(key, input.mimeType);
}
