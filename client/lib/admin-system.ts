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

/** A step of first-time setup on a self-hosted install. Only "ai" is required. */
export type SetupItemId = "ai" | "storage" | "email" | "signIn";

export interface SetupStatus {
  /** Every step is either set up or the admin kept its default. */
  complete: boolean;
  items: { id: SetupItemId; required: boolean; done: boolean; skipped: boolean }[];
}

export function getSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>("/admin/system/setup");
}

/** Keep an optional step's default (`skipped: true`), or bring the step back. */
export function setSetupSkipped(item: SetupItemId, skipped: boolean): Promise<SetupStatus> {
  return apiFetch<SetupStatus>(`/admin/system/setup/${item}/skip`, { method: skipped ? "POST" : "DELETE" });
}
