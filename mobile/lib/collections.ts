import { apiFetch } from "@/lib/api";

export interface Collection {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  memoryCount: number;
}

export async function listCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>("/collections");
}

export async function createCollection(input: { name: string; icon?: string; description?: string }): Promise<Collection> {
  return apiFetch<Collection>("/collections", { method: "POST", body: input });
}

export async function updateCollection(
  id: string,
  patch: { name?: string; icon?: string; description?: string },
): Promise<Collection> {
  return apiFetch<Collection>(`/collections/${id}`, { method: "PATCH", body: patch });
}

export async function deleteCollection(id: string): Promise<void> {
  await apiFetch<void>(`/collections/${id}`, { method: "DELETE" });
}
