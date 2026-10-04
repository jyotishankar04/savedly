import { apiFetch } from "@/lib/auth";

export type ClearMemoriesMode = "trash" | "delete";
export type DeleteAccountMode = "soft" | "hard";

export async function clearMemories(mode: ClearMemoriesMode): Promise<{ mode: string; count?: number; deleted?: number; failed?: number }> {
  return apiFetch("/account/clear-memories", { method: "POST", body: { mode } });
}

export async function deleteAccount(mode: DeleteAccountMode): Promise<{ mode: string }> {
  return apiFetch("/account/delete", { method: "POST", body: { mode } });
}
