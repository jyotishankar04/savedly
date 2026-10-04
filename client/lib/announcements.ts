import { apiFetch } from "@/lib/auth";

export type AnnouncementType = "countdown" | "announcement" | "update";
export type AnnouncementDisplayMode = "banner" | "full_page";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  displayMode: AnnouncementDisplayMode;
  title: string;
  message: string;
  targetDate: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  type: AnnouncementType;
  displayMode?: AnnouncementDisplayMode;
  title: string;
  message: string;
  targetDate?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  /** Create-only — sends the title/message to all active users via the same bulk composer as /admin/emails. Ignored on update. */
  notifyByEmail?: boolean;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>("/admin/announcements");
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return apiFetch<Announcement>("/admin/announcements", { method: "POST", body: input });
}

export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>): Promise<Announcement> {
  return apiFetch<Announcement>(`/admin/announcements/${id}`, { method: "PATCH", body: input });
}

export async function deleteAnnouncement(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/admin/announcements/${id}`, { method: "DELETE" });
}

/** Public, unauthenticated — the currently active announcement/countdown, or null. */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  return apiFetch<Announcement | null>("/announcements/active");
}
