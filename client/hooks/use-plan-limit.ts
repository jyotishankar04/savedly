import { useQuery } from "@tanstack/react-query";
import {
  getMyPlan,
  formatLimitValue,
  listPublicPlans,
  PLAN_FEATURE_LABEL,
  PLAN_LIMIT_LABEL,
  type PlanFeature,
  type PlanLimitType,
} from "@/lib/plans";

export const myPlanQueryKey = ["plans", "me"];

// Shared across every button/form that needs to know "can the user still do
// this" before they click — one query, cached and deduped by React Query,
// so mounting this in several places (capture, collections, ask) doesn't
// mean several network requests.
export function useMyPlanQuery() {
  return useQuery({ queryKey: myPlanQueryKey, queryFn: getMyPlan });
}

export interface PlanLimitStatus {
  loading: boolean;
  limit: number | null; // null = unlimited on the current plan
  used: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  remaining: number | null;
  planName: string | null;
  label: string;
  /** Ready-to-render copy: "You've reached your Free plan's Memories limit (100)." */
  message: string | null;
}

export function usePlanLimit(limitType: PlanLimitType): PlanLimitStatus {
  const { data, isLoading } = useMyPlanQuery();

  const limit = data?.limits[limitType] ?? null;
  const used = data?.usage[limitType] ?? 0;
  const isUnlimited = Boolean(data) && limit == null;
  const isAtLimit = Boolean(data) && !isUnlimited && limit != null && used >= limit;
  const label = PLAN_LIMIT_LABEL[limitType];

  return {
    loading: isLoading,
    limit,
    used,
    isUnlimited,
    isAtLimit,
    remaining: isUnlimited || limit == null ? null : Math.max(0, limit - used),
    planName: data?.plan.name ?? null,
    label,
    message:
      isAtLimit && data && limit != null
        ? `You've reached your ${data.plan.name} plan's ${label} limit (${formatLimitValue(limitType, limit)}).`
        : null,
  };
}

/**
 * The user's actual billing plan, for display ("FREE", "PLUS", "PRO").
 *
 * Reads the plan, not the RBAC role. The two are independent: a role says
 * what you may do (`user` / `admin`), a plan says what you've paid for.
 * See formatRole in context/UserContext.tsx.
 */
export function usePlanLabel(): { loading: boolean; label: string; isFree: boolean } {
  const { data, isLoading } = useMyPlanQuery();

  return {
    loading: isLoading,
    label: (data?.plan.name ?? "Free").toUpperCase(),
    // Treated as free until we know otherwise, so upgrade prompts don't
    // flash at a paying user on every page load.
    isFree: Boolean(data) && data!.plan.key === "free",
  };
}

export interface PlanFeatureStatus {
  loading: boolean;
  /** True while loading, so nothing flashes locked for someone who has it. */
  allowed: boolean;
  /** Same as `allowed` (older name). */
  enabled: boolean;
  /** The user's current plan. */
  planName: string | null;
  /** The cheapest plan that has it, for "Upgrade to Lite" copy. */
  requiredPlan: string | null;
  label: string;
}

/**
 * Whether the user's plan unlocks `feature` (plan.features). Every feature is
 * on for a self-hosted install. The server enforces the same rule; this is
 * only so the UI can say so before anyone clicks.
 */
export function usePlanFeature(feature: PlanFeature | (string & {})): PlanFeatureStatus {
  const { data, isLoading } = useMyPlanQuery();
  const { data: plans } = useQuery({ queryKey: ["plans", "public"], queryFn: listPublicPlans, enabled: !!data && !data.selfHosted });
  const allowed = !data || data.selfHosted || data.plan.features?.[feature] === true;
  const requiredPlan = allowed ? null : (plans?.find((p) => p.features?.[feature])?.name ?? null);
  return {
    loading: isLoading,
    allowed,
    enabled: allowed,
    planName: data?.plan.name ?? null,
    requiredPlan,
    label: PLAN_FEATURE_LABEL[feature as PlanFeature] ?? feature,
  };
}
