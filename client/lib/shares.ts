import { apiFetch } from "@/lib/auth";
import type { MemoryType } from "@/types/memory";

export type ShareResourceType = "collection" | "memory";

/** What the link itself does. Per-user grants are separate and compose with it. */
export type ShareLinkAccess = "disabled" | "public" | "request" | "password";

/** The error codes the gate branches on — mirrors share.controller.ts. */
export type ShareGateCode =
  | "SHARE_PASSWORD_REQUIRED"
  | "SHARE_AUTH_REQUIRED"
  | "SHARE_ACCESS_REQUIRED"
  | "SHARE_ACCESS_PENDING"
  | "SHARE_ACCESS_DENIED";

/** Everything a gate screen is allowed to know. Deliberately no title. */
export interface ShareStub {
  slug: string;
  resourceType: ShareResourceType;
  linkAccess: ShareLinkAccess;
  ownerName: string | null;
}

export interface SharedMemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  url: string | null;
  description: string | null;
  content: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  createdAt: string;
}

export interface SharedResourcePayload {
  resourceType: ShareResourceType;
  slug: string;
  allowSearchIndexing: boolean;
  ownerName: string | null;
  collection: { name: string; icon: string; description: string | null } | null;
  memories: SharedMemoryItem[];
}

export type ShareMeta =
  | {
      mode: "open";
      allowSearchIndexing: boolean;
      isPublic: boolean;
      resourceType: ShareResourceType;
      title: string;
      description: string | null;
      ownerName: string | null;
      memoryCount: number;
    }
  | { mode: "gated"; gate: ShareGateCode; share: ShareStub };

export interface Share {
  id: string;
  resourceType: ShareResourceType;
  resourceId: string;
  slug: string;
  linkAccess: ShareLinkAccess;
  hasPassword: boolean;
  allowSearchIndexing: boolean;
  expiresAt: string | null;
  viewCount: number;
  grantCount: number;
  pendingRequestCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShareListItem extends Share {
  resourceName: string;
}

export interface SharedWithMeItem {
  shareId: string;
  slug: string;
  resourceType: ShareResourceType;
  resourceName: string;
  ownerName: string | null;
  sharedAt: string;
}

export interface ShareGrant {
  id: string;
  email: string;
  userId: string | null;
  name: string | null;
  status: "pending" | "active" | "revoked";
  createdAt: string;
}

export interface ShareAccessRequest {
  id: string;
  shareId: string;
  slug: string;
  resourceName: string;
  requesterName: string | null;
  requesterEmail: string;
  message: string | null;
  status: "pending" | "approved" | "denied" | "cancelled";
  createdAt: string;
}

export interface UpdateSharePatch {
  linkAccess?: ShareLinkAccess;
  /** null clears it; omit to leave unchanged. */
  password?: string | null;
  allowSearchIndexing?: boolean;
  expiresAt?: string | null;
}

// ---- public reader (browser-side; the server component uses serverApiFetch) ----

export const getSharedResource = (slug: string) => apiFetch<SharedResourcePayload>(`/s/${slug}`);

export const unlockShare = (slug: string, password: string) =>
  apiFetch<{ unlocked: boolean }>(`/s/${slug}/unlock`, { method: "POST", body: { password } });

export const requestShareAccess = (slug: string, message?: string) =>
  apiFetch<{ status: string }>(`/s/${slug}/request-access`, { method: "POST", body: { message } });

export const cancelShareAccessRequest = (slug: string) =>
  apiFetch<void>(`/s/${slug}/request-access`, { method: "DELETE" });

// ---- owner side ----

export const listMyShares = () => apiFetch<ShareListItem[]>("/shares");

export const listSharedWithMe = () => apiFetch<SharedWithMeItem[]>("/shares/shared-with-me");

export const listAllPendingRequests = () => apiFetch<ShareAccessRequest[]>("/shares/requests");

export const getShareForResource = (resourceType: ShareResourceType, resourceId: string) =>
  apiFetch<Share | null>(`/shares/resource/${resourceType}/${resourceId}`);

export const createShare = (resourceType: ShareResourceType, resourceId: string) =>
  apiFetch<Share>("/shares", { method: "POST", body: { resourceType, resourceId } });

export const updateShare = (id: string, patch: UpdateSharePatch) =>
  apiFetch<Share>(`/shares/${id}`, { method: "PATCH", body: patch });

export const rotateShareSlug = (id: string) =>
  apiFetch<Share>(`/shares/${id}/rotate-slug`, { method: "POST" });

export const deleteShare = (id: string) => apiFetch<void>(`/shares/${id}`, { method: "DELETE" });

export const listShareGrants = (id: string) => apiFetch<ShareGrant[]>(`/shares/${id}/grants`);

export interface ShareViewSummary {
  totalViews: number;
  uniqueSignedInViewers: number;
  uniqueAnonymousViewers: number;
  lastViewedAt: string | null;
}

export interface ShareViewerEntry {
  id: string;
  viewerName: string | null;
  viewerEmail: string | null;
  isAnonymous: boolean;
  viewedAt: string;
}

export const getShareViewSummary = (id: string) => apiFetch<ShareViewSummary>(`/shares/${id}/views/summary`);

export const listShareViewers = (id: string) => apiFetch<ShareViewerEntry[]>(`/shares/${id}/views`);

export interface DateCount {
  date: string;
  count: number;
}

export const getShareViewsDaily = (id: string) => apiFetch<DateCount[]>(`/shares/${id}/views/daily`);

function toLocalKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The API only returns days that had a view; the chart wants a dense,
 * contiguous run ending today so a quiet stretch reads as zero, not as a
 * missing bar. Built in local time, matching the server's `date(created_at)`
 * bucketing — going through toISOString() here would shift a day at either
 * side of UTC midnight.
 */
export function fillDailyViewSeries(data: DateCount[], days = 30): DateCount[] {
  const counts = new Map(data.map((entry) => [entry.date, entry.count]));
  const out: DateCount[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = toLocalKey(date);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return out;
}

export const inviteToShare = (id: string, email: string) =>
  apiFetch<ShareGrant>(`/shares/${id}/grants`, { method: "POST", body: { email } });

export const revokeShareGrant = (id: string, grantId: string) =>
  apiFetch<void>(`/shares/${id}/grants/${grantId}`, { method: "DELETE" });

export const approveShareRequest = (id: string, requestId: string) =>
  apiFetch<void>(`/shares/${id}/requests/${requestId}/approve`, { method: "POST" });

export const denyShareRequest = (id: string, requestId: string) =>
  apiFetch<void>(`/shares/${id}/requests/${requestId}/deny`, { method: "POST" });

/** The canonical public URL for a share. One route serves both resource types. */
export function shareUrl(slug: string, origin = ""): string {
  return `${origin}/s/${slug}`;
}
