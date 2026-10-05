import { File, UploadType } from "expo-file-system";
import { apiFetch } from "./api";

export interface UploadedFile {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

/**
 * Uploads a local file (a share-intent attachment, or a screenshot read off
 * the media library) straight to R2 via a presigned URL — mirrors
 * client/lib/uploads.ts's two-step presign-then-PUT flow, but PUTs raw bytes
 * from a local file:// URI instead of a browser File/Blob, since neither
 * exists on native.
 */
export async function uploadLocalFile(localUri: string, filename: string, mimeType: string): Promise<UploadedFile> {
  const file = new File(localUri);
  const fileSize = file.size ?? 0;

  const presigned = await apiFetch<PresignedUpload>("/uploads/presign", {
    method: "POST",
    body: { filename, mimeType, fileSize },
  });

  // Goes straight to R2, not through our API — no auth header, no envelope.
  const result = await file.upload(presigned.uploadUrl, {
    uploadType: UploadType.BINARY_CONTENT,
    httpMethod: "PUT",
    mimeType,
    headers: { "Content-Type": mimeType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error("Upload failed. Please try again.");
  }

  return { fileUrl: presigned.fileUrl, mimeType, fileSize };
}
