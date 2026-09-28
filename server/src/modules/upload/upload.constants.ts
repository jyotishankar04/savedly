export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// The hard ceiling for any upload. The effective cap is the plan's
// max_file_mb limit (plans.service.ts assertFileSizeAllowed), up to this.
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
