import { apiFetch } from "@/lib/auth";

export type NotificationType =
  | "share_invite_received"
  | "share_access_requested"
  | "share_access_approved"
  | "share_access_denied"
  | "share_revoked"
  | "event_detected";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  actionUrl: string | null;
  /**
   * Loose by design — carries whatever the emitting feature needs the UI
   * to act on. For share_access_requested that's `shareId` + `requestId`,
   * which is what lets the notifications page approve inline.
   */
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const listNotifications = (status: "unread" | "all" = "all") =>
  apiFetch<AppNotification[]>(`/notifications?status=${status}`);

export const getUnreadCount = () => apiFetch<{ count: number }>("/notifications/unread-count");

export const markNotificationRead = (id: string) =>
  apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  apiFetch<void>("/notifications/read-all", { method: "POST" });

export const deleteNotification = (id: string) =>
  apiFetch<void>(`/notifications/${id}`, { method: "DELETE" });

/** Narrow the loose metadata bag for the one type the UI acts on. */
export function accessRequestRefs(n: AppNotification): { shareId: string; requestId: string } | null {
  const shareId = n.metadata?.shareId;
  const requestId = n.metadata?.requestId;
  if (typeof shareId !== "string" || typeof requestId !== "string") return null;
  return { shareId, requestId };
}

export function eventDetectedRefs(n: AppNotification): { memoryId: string; suggestedEventAt: string } | null {
  const memoryId = n.metadata?.memoryId;
  const suggestedEventAt = n.metadata?.suggestedEventAt;
  if (typeof memoryId !== "string" || typeof suggestedEventAt !== "string") return null;
  return { memoryId, suggestedEventAt };
}
