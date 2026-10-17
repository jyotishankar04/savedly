import axios from "axios";
import { apiFetch } from "@/lib/auth";

/** What the server takes as an attachment (server/src/modules/upload/upload.constants.ts). */
export const UPLOADABLE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);

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
 * Uploads a file straight to R2 via a presigned URL — the bytes never pass
 * through our server. Two steps: ask the API to sign a PUT URL for this
 * exact filename/mimeType/size, then PUT the file directly to R2 with that
 * URL. The presigned URL is signed for this exact Content-Type, so R2
 * rejects the PUT if the browser sends anything else.
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const presigned = await apiFetch<PresignedUpload>("/uploads/presign", {
    method: "POST",
    body: {
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    },
  });

  // Goes straight to R2, not through our API — no auth cookies, no envelope.
  try {
    await axios.put(presigned.uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });
  } catch {
    throw new Error("Upload failed. Please try again.");
  }

  return {
    fileUrl: presigned.fileUrl,
    mimeType: file.type,
    fileSize: file.size,
  };
}
