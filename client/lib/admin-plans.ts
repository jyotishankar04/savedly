import { apiFetch } from "@/lib/auth";
import type { Plan, PlanLimitType, PlanLimits } from "@/lib/plans";

export interface AdminPlan extends Plan {
  limits: PlanLimits;
}

export interface PlanLimitInput {
  limitType: PlanLimitType;
  limitValue: number | null;
}

export interface UpsertPlanInput {
  key?: string; // only sent on create — the server rejects it on update
  name: string;
  description?: string;
  priceMinor: number;
  currency?: string;
  billingInterval?: Plan["billingInterval"];
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  limits?: PlanLimitInput[];
  /** What the plan unlocks. Sent whole: it replaces the plan's features. */
  features?: Record<string, boolean>;
}

export async function listAdminPlans(): Promise<AdminPlan[]> {
  return apiFetch<AdminPlan[]>("/admin/plans");
}

export async function createPlan(input: UpsertPlanInput): Promise<AdminPlan> {
  return apiFetch<AdminPlan>("/admin/plans", { method: "POST", body: input });
}

export async function updatePlan(id: string, input: Partial<UpsertPlanInput>): Promise<AdminPlan> {
  return apiFetch<AdminPlan>(`/admin/plans/${id}`, { method: "PATCH", body: input });
}

export interface PlanGrantsSummary {
  grants: number;
  activeGrants: number;
  openEndedGrants: number;
  totals: { currency: string; givenSoFarMinor: number; monthlyNowMinor: number; stillToComeMinor: number }[];
  byAdmin: { email: string; grants: number; givenSoFarMinor: number; currency: string }[];
  active: {
    id: string;
    userId: string | null;
    userEmail: string | null;
    planName: string;
    startsAt: string;
    endsAt: string | null;
    reason: string | null;
    assignedByEmail: string | null;
    currency: string;
    monthlyMinor: number;
    givenSoFarMinor: number;
  }[];
}

/** What admins have given away as plan grants, valued at plan prices. */
export function getPlanGrantsSummary(): Promise<PlanGrantsSummary> {
  return apiFetch<PlanGrantsSummary>("/admin/plans/grants/summary");
}
