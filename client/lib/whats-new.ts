import { apiFetch } from "@/lib/auth";

export type WhatsNewKind = "new" | "improved" | "upcoming";

/** A card in the landing page's "What's new" popup. */
export interface WhatsNewCardData {
  id: string;
  kind: WhatsNewKind;
  title: string;
  body: string | null;
  bullets: string[];
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  updatedAt: string;
}

/** The admin's view of a card: the same, plus what visitors don't need. */
export interface WhatsNewItem extends WhatsNewCardData {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface WhatsNewInput {
  kind?: WhatsNewKind;
  title: string;
  body?: string | null;
  bullets?: string[];
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive?: boolean;
}

export const WHATS_NEW_KIND_LABEL: Record<WhatsNewKind, string> = {
  new: "New",
  improved: "Improved",
  upcoming: "Coming soon",
};

/** Public, unauthenticated: the active cards, in the order the stack shows them. */
export async function getActiveWhatsNew(): Promise<WhatsNewCardData[]> {
  return apiFetch<WhatsNewCardData[]>("/whats-new/active");
}

export async function listWhatsNew(): Promise<WhatsNewItem[]> {
  return apiFetch<WhatsNewItem[]>("/admin/whats-new");
}

export async function createWhatsNew(input: WhatsNewInput): Promise<WhatsNewItem> {
  return apiFetch<WhatsNewItem>("/admin/whats-new", { method: "POST", body: input });
}

export async function updateWhatsNew(id: string, input: Partial<WhatsNewInput>): Promise<WhatsNewItem> {
  return apiFetch<WhatsNewItem>(`/admin/whats-new/${id}`, { method: "PATCH", body: input });
}

export async function reorderWhatsNew(ids: string[]): Promise<WhatsNewItem[]> {
  return apiFetch<WhatsNewItem[]>("/admin/whats-new/order", { method: "PUT", body: { ids } });
}

export async function deleteWhatsNew(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/admin/whats-new/${id}`, { method: "DELETE" });
}
