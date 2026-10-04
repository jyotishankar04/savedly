import { apiFetch, apiFetchRaw } from "@/lib/auth";
import type { BillingStatus } from "@/lib/plans";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: "active" | "inactive" | "banned" | "suspended" | "deleted";
  emailVerified: boolean;
  createdAt: string;
  roles: string[];
  planKey: string | null;
  planName: string | null;
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  emailVerifiedAt: string | null;
  stats: { memoryCount: number; collectionCount: number };
}

export interface ListUsersParams {
  q?: string;
  status?: AdminUser["status"];
  role?: string;
  plan?: string;
  page?: number;
  limit?: number;
}

export interface ListUsersResult {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
}

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const { data, meta } = await apiFetchRaw<AdminUser[]>(`/admin/users${toQueryString(params)}`);
  return {
    items: data,
    page: (meta.page as number) ?? 1,
    limit: (meta.limit as number) ?? 20,
    total: (meta.total as number) ?? data.length,
  };
}

export async function getUser(id: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}

export async function updateUserRoles(
  id: string,
  role: string,
  action: "grant" | "revoke",
): Promise<{ userId: string; roles: string[] }> {
  return apiFetch<{ userId: string; roles: string[] }>(`/admin/users/${id}/roles`, {
    method: "PATCH",
    body: { role, action },
  });
}

export async function updateUserStatus(id: string, status: AdminUser["status"]): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

/** Dev builds and self-hosted installs only: hosted production rejects it. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}

/** An admin adds an account directly with a temporary password (works with public signups off). */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
}): Promise<{ id: string; email: string; name: string | null }> {
  return apiFetch(`/admin/users`, { method: "POST", body: input });
}

/** Sets a new password for a user and signs them out everywhere. */
export async function setUserPassword(id: string, password: string): Promise<void> {
  await apiFetch(`/admin/users/${id}/password`, { method: "PUT", body: { password } });
}

export type PlanSource = "subscription" | "admin_manual" | "signup_default";

export interface UserPlanHistoryRow {
  id: string;
  planKey: string;
  planName: string;
  status: "active" | "expired" | "cancelled" | "superseded";
  source: PlanSource;
  startsAt: string;
  endsAt: string | null;
  reason: string | null;
  assignedByEmail: string | null;
  currency: string;
  /** Admin grants only: what it's worth at the plan's price. */
  value: { monthlyMinor: number; givenSoFarMinor: number; stillToComeMinor: number } | null;
}

export interface AdminUserPlan {
  /** Their live Dodo subscription: when `changeable`, the admin form changes it instead of granting. */
  billing: BillingStatus["subscription"];
  current: { planKey: string; planName: string; source: PlanSource | null; endsAt: string | null; reason: string | null };
  /** The paid subscription underneath, if any — what they fall back to when a grant ends. */
  subscription: UserPlanHistoryRow | null;
  hasActiveGrant: boolean;
  history: UserPlanHistoryRow[];
}

export function getUserPlan(id: string): Promise<AdminUserPlan> {
  return apiFetch<AdminUserPlan>(`/admin/users/${id}/plan`);
}

/** Puts the user on `planKey` until `endsAt` (null = no end), over whatever they pay for. Doesn't touch billing. */
export function grantUserPlan(id: string, input: { planKey: string; endsAt: string | null; reason?: string }): Promise<AdminUserPlan> {
  return apiFetch<AdminUserPlan>(`/admin/users/${id}/plan`, { method: "POST", body: input });
}

/** Ends the admin grant: back to what they pay for, or the default plan. */
export function removeUserPlanGrant(id: string): Promise<AdminUserPlan> {
  return apiFetch<AdminUserPlan>(`/admin/users/${id}/plan`, { method: "DELETE" });
}
