import { apiFetch, apiFetchRaw } from "@/lib/auth";

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

/** Dev-only: the server rejects this in production. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}
