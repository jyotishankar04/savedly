import { apiFetch } from "@/lib/auth";

export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

export interface BatchTagInput {
  memoryIds: string[];
  tagNames: string[];
  mode: "add" | "remove" | "replace";
}

export const batchTagMemories = (input: BatchTagInput) =>
  apiFetch<BatchResult>("/batch/memories/tag", { method: "POST", body: input });

export interface BatchMoveInput {
  memoryIds: string[];
  collectionId: string;
  mode: "add" | "move";
}

export const batchMoveToCollection = (input: BatchMoveInput) =>
  apiFetch<BatchResult>("/batch/memories/move", { method: "POST", body: input });

export interface BatchDeleteInput {
  memoryIds: string[];
  permanent: boolean;
}

export const batchDeleteMemories = (input: BatchDeleteInput) =>
  apiFetch<BatchResult>("/batch/memories/delete", { method: "POST", body: input });

export interface BatchRestoreInput {
  memoryIds: string[];
}

export const batchRestoreMemories = (input: BatchRestoreInput) =>
  apiFetch<BatchResult>("/batch/memories/restore", { method: "POST", body: input });

export interface BatchStatusInput {
  memoryIds: string[];
  archived?: boolean;
  favorite?: boolean;
  vaulted?: boolean;
}

export const batchUpdateStatus = (input: BatchStatusInput) =>
  apiFetch<BatchResult>("/batch/memories/status", { method: "POST", body: input });
