import { apiFetch } from "@/lib/auth";

/** Self-hosted installs only — see server admin/system. */
export interface SystemStatus {
  version: string | null;
  users: number;
  memories: number;
  databaseBytes: number;
  /** null when files live in S3-compatible storage (not measured). */
  filesBytes: number | null;
  services: {
    storage: string;
    vectorStore: string;
    email: boolean;
    embeddingsKey: boolean;
    sharedAi: boolean;
    googleSignIn: boolean;
    githubSignIn: boolean;
  };
}

export function getSystemStatus(): Promise<SystemStatus> {
  return apiFetch<SystemStatus>("/admin/system");
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "Empty";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
