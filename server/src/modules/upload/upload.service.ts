import { randomUUID } from "crypto";
import { extname } from "path";
import { getStorage, type PresignedUpload } from "../../platform/storage";
import { PlanLimitType } from "../../db/enums";
import { assertFileSizeAllowed, assertWithinLimit } from "../plans/api";
import type { PresignUploadInput } from "./upload.schema";

export type { PresignedUpload };

// The client PUTs to `uploadUrl`: straight to R2/S3, or to /files/upload with the local driver
// (platform/storage). Signed for this Content-Type, expires in five minutes.
export async function createPresignedUpload(userId: string, input: PresignUploadInput): Promise<PresignedUpload> {
  await assertFileSizeAllowed(userId, input.fileSize);
  await assertWithinLimit(userId, PlanLimitType.STORAGE_MB, Math.ceil(input.fileSize / (1024 * 1024)));

  const key = `${randomUUID()}${extname(input.filename).toLowerCase()}`;
  const storage = await getStorage();
  return storage.createUpload(key, input.mimeType);
}
