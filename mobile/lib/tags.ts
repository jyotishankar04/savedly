import { apiFetch } from "@/lib/api";

export interface Tag {
  id: string;
  name: string;
  memoryCount: number;
}

export async function listTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>("/tags");
}
