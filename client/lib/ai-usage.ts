import { apiFetch, apiFetchRaw } from "@/lib/auth";

export interface UsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costEstimateUsd: number;
}

export interface UsageSummary {
  totals: UsageTotals;
  byProvider: (UsageTotals & { provider: string })[];
  byModel: (UsageTotals & { model: string })[];
  byRequestType: (UsageTotals & { requestType: string })[];
  byDay: (UsageTotals & { date: string })[];
}

export interface UsageByUserItem extends UsageTotals {
  userId: string;
  email: string | null;
  name: string | null;
}

export interface UsageByUserResult {
  items: UsageByUserItem[];
  page: number;
  limit: number;
  total: number;
}

export interface UsageLogRow {
  id: string;
  userId: string | null;
  requestType: string;
  provider: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costEstimateUsd: number | null;
  threadId: string | null;
  memoryId: string | null;
  createdAt: string;
}

export interface UsageForUser {
  user: { id: string; email: string; name: string | null };
  totals: UsageTotals;
  byRequestType: (UsageTotals & { requestType: string })[];
  recent: UsageLogRow[];
}

export async function getUsageSummary(days = 30): Promise<UsageSummary> {
  return apiFetch<UsageSummary>(`/admin/ai-usage/summary?days=${days}`);
}

export async function getUsageByUser(days = 30, page = 1, limit = 20): Promise<UsageByUserResult> {
  const { data, meta } = await apiFetchRaw<UsageByUserItem[]>(`/admin/ai-usage/by-user?days=${days}&page=${page}&limit=${limit}`);
  return {
    items: data,
    page: (meta.page as number) ?? page,
    limit: (meta.limit as number) ?? limit,
    total: (meta.total as number) ?? data.length,
  };
}

export async function getUsageForUser(userId: string, days = 30): Promise<UsageForUser> {
  return apiFetch<UsageForUser>(`/admin/ai-usage/users/${userId}?days=${days}`);
}

/** Whether the instance's own AI account is answering (server ai/provider-health.ts). */
export interface AiHealth {
  ok: boolean;
  problem: "no-credits" | null;
  provider: string | null;
  since: string | null;
}

export function getAiHealth(): Promise<AiHealth> {
  return apiFetch<AiHealth>("/admin/ai-usage/health");
}
