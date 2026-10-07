import { apiFetch } from "@/lib/auth";

export type PlanLimitType =
  | "memory_count"
  | "storage_mb"
  | "max_file_mb"
  | "public_share_count"
  | "collection_count"
  | "ai_monthly_saves"
  | "ai_monthly_queries"
  | "import_monthly_count";

export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  // Mirrors the server's PlanBillingInterval enum (server/src/db/enums.ts) —
  // semi_annual was added there and never here, which is why the pricing
  // table's "every 6 months" branch looked unreachable to the compiler.
  billingInterval: "monthly" | "semi_annual" | "yearly" | "one_time";
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  features: Record<string, boolean>;
}

export interface PlanAssignment {
  id: string;
  planId: string;
  status: string;
  source: string;
  startsAt: string;
  endsAt: string | null;
}

// null = unlimited (a limit type the plan doesn't cap at all).
export type PlanLimits = Partial<Record<PlanLimitType, number | null>>;
export type PlanUsage = Partial<Record<PlanLimitType, number>>;

export interface MyPlanSummary {
  plan: Plan;
  assignment: PlanAssignment | null;
  limits: PlanLimits;
  usage: PlanUsage;
  /** A self-hosted install: one unlimited plan, no billing. */
  selfHosted: boolean;
}

export interface PublicPlan extends Plan {
  limits: PlanLimits;
}

export async function getMyPlan(): Promise<MyPlanSummary> {
  return apiFetch<MyPlanSummary>("/plans/me");
}

export async function listPublicPlans(): Promise<PublicPlan[]> {
  return apiFetch<PublicPlan[]>("/plans");
}

// The ai_monthly_* limits cap the AI we supply each month (hosted plans have
// no own keys; a self-hosted install has no limits at all).
export const PLAN_LIMIT_LABEL: Record<PlanLimitType, string> = {
  memory_count: "Memories",
  storage_mb: "Storage",
  max_file_mb: "Largest file",
  public_share_count: "Public share links",
  collection_count: "Collections",
  // One per saved item, every step of reading and filing it (images included).
  ai_monthly_saves: "AI processing (saves) / month",
  ai_monthly_queries: "Ask questions / month",
  import_monthly_count: "Imports / month",
};

/**
 * What a plan unlocks beyond volume — keys of plan.features, mirroring the
 * server's PLAN_FEATURES (server/src/modules/plans/plans.service.ts). In the
 * order the pricing page lists them.
 */
export const PLAN_FEATURE_LABEL = {
  vault: "Private vault, PIN-protected",
  batchOperations: "Bulk actions",
  aiEventDetection: "Events found in what you save",
  calendarSync: "Google Calendar sync",
  passwordProtectedShares: "Password-protected links",
  directShares: "Invite people to what you share",
  privateShareRequests: "Links people request access to",
  shareAnalyticsDaily: "Daily views on shared links",
  shareAnalyticsViewers: "See who viewed your links",
  insightsFullHistory: "A full year of insights",
} as const;
export type PlanFeature = keyof typeof PLAN_FEATURE_LABEL;

/** Feature lines for a pricing card: what `features` adds over `base` (the tier below). */
export function planFeatureBullets(features: Record<string, boolean>, base: Record<string, boolean> = {}): string[] {
  return (Object.keys(PLAN_FEATURE_LABEL) as PlanFeature[])
    .filter((f) => features[f] && !base[f])
    .map((f) => PLAN_FEATURE_LABEL[f]);
}

export function formatLimitValue(limitType: PlanLimitType, value: number): string {
  if (limitType === "storage_mb" || limitType === "max_file_mb") {
    // 1024 -> "1 GB", 1536 -> "1.5 GB"
    return value >= 1024 ? `${Math.round((value / 1024) * 10) / 10} GB` : `${value} MB`;
  }
  return value.toLocaleString();
}

/** An amount of money, where 0 is "$0" (formatPriceMinor calls a zero price "Free"). */
export function formatMoneyMinor(amountMinor: number, currency: string): string {
  return amountMinor === 0 ? formatPriceMinor(100, currency).replace(/1$/, "0") : formatPriceMinor(amountMinor, currency);
}

export function formatPriceMinor(priceMinor: number, currency: string): string {
  if (priceMinor === 0) return "Free";
  const symbol = currency === "usd" ? "$" : currency === "inr" ? "₹" : currency.toUpperCase() + " ";
  // Whole amounts stay short ("$9"); anything else shows cents ("$7.50").
  const amount = priceMinor % 100 === 0 ? (priceMinor / 100).toLocaleString("en-US") : (priceMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${amount}`;
}

export const LIMIT_ORDER: PlanLimitType[] = [
  "memory_count",
  "storage_mb",
  "max_file_mb",
  "public_share_count",
  "collection_count",
  "ai_monthly_saves",
  "ai_monthly_queries",
  "import_monthly_count",
];

/**
 * Turns a plan's real, admin-editable limits into pricing-page bullet copy
 * ("Unlimited memories", "20 Ask Savedly queries / month", ...) —
 * used instead of a hand-written per-plan feature list so the marketing
 * pricing table can never drift out of sync with what's actually enforced.
 */
/** "AI processing for 2,000 saves and 1,000 Ask questions". */
function aiSummary(saves?: number | null, asks?: number | null): string {
  const parts = [
    saves === null ? "AI processing for unlimited saves" : saves ? `AI processing for ${saves.toLocaleString("en-US")} saves` : null,
    asks === null ? "unlimited Ask questions" : asks ? `${asks.toLocaleString("en-US")} Ask questions` : null,
  ].filter((p): p is string => !!p);
  return parts.join(" and ");
}

export function planLimitBullets(limits: PlanLimits, features: Record<string, boolean> = {}): string[] {
  const aiTypes: PlanLimitType[] = ["ai_monthly_saves", "ai_monthly_queries"];
  const bullets = LIMIT_ORDER.filter((t) => t in limits && !aiTypes.includes(t)).map((t) => {
    const value = limits[t];
    if (t === "max_file_mb") return value == null ? "Files of any size" : `Files up to ${formatLimitValue(t, value)}`;
    if (t === "import_monthly_count") {
      return value == null ? "Unlimited imports" : `${value} ${value === 1 ? "import" : "imports"} a month`;
    }
    const amount = value == null ? "Unlimited" : formatLimitValue(t, value);
    return `${amount} ${PLAN_LIMIT_LABEL[t].toLowerCase()}`;
  });

  // Included AI reads as one line: what we supply on our key each month.
  const saves = limits.ai_monthly_saves;
  const asks = limits.ai_monthly_queries;
  if ([saves, asks].every((v) => v === 0)) {
    bullets.push("Bring your own AI key");
  } else if (features.managedAi) {
    // We supply all of it, so there are no keys to bring.
    bullets.push(`${aiSummary(saves, asks)} a month`);
  } else {
    bullets.push(`${aiSummary(saves, asks)} a month, on us`);
    bullets.push("Your own AI key works too, with no limits");
  }
  return bullets;
}

/**
 * Starts buying `planKey`. For someone who already pays, this upgrades the
 * subscription in place and charges the saved card at once — so pass
 * confirmUpgrade only after showing them previewUpgrade's amount.
 */
export async function startCheckout(planKey: string, confirmUpgrade = false): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/billing/checkout", { method: "POST", body: { planKey, confirmUpgrade } });
  return url;
}

export type UpgradePreview =
  | { mode: "checkout"; planName: string }
  | {
      mode: "change";
      planName: string;
      fromPlanName: string;
      billingInterval: Plan["billingInterval"];
      chargeNowMinor: number;
      taxMinor: number | null;
      currency: string;
      renewalMinor: number;
      renewalCurrency: string;
    };

/** What upgrading to `planKey` would charge right now (nothing is charged). */
export async function previewUpgrade(planKey: string): Promise<UpgradePreview> {
  return apiFetch<UpgradePreview>("/billing/upgrade-preview", { method: "POST", body: { planKey } });
}

export interface BillingStatus {
  /** The paid subscription the user's plan rests on, with its live state from the provider. */
  subscription: {
    planKey: string;
    planName: string;
    sortOrder: number;
    status: "active" | "past_due" | "cancelled" | "ended";
    /** Renews on, or (cancelled) access ends on. */
    periodEnd: string | null;
    /** True when moving up changes this subscription in place and charges the saved card. */
    changeable: boolean;
    /** Still active, but set not to renew. */
    cancelAtPeriodEnd: boolean;
  } | null;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>("/billing/status");
}

/** Asks the server to read your subscription from the payment provider now, instead of waiting for its webhook. */
export async function syncBilling(): Promise<{ applied: number }> {
  return apiFetch<{ applied: number }>("/billing/sync", { method: "POST" });
}

export async function openBillingPortal(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/billing/portal", { method: "POST" });
  return url;
}

/** One-line pitch per tier (planTier), shared by the pricing page and Settings -> Plan & usage. */
export const PLAN_TIER_TAGLINE: Record<string, string> = {
  free: "The essentials, with AI we supply.",
  lite: "More room, the vault and bulk actions.",
  ai: "Everything, with the most room.",
};

/** A plan's tier, e.g. "ai-monthly" -> "ai". Monthly and yearly variants of one tier share it. */
export function planTier(key: string): string {
  return key.replace(/-(monthly|yearly|semi-annual|annual)$/, "");
}

/**
 * The plans worth offering someone on `current`: every priced paid plan for
 * a Free user; only plans ranked above theirs (sortOrder — Lite monthly <
 * Lite yearly < AI included monthly < AI included yearly) for a subscriber. Mirrors the server, which refuses anything else at checkout.
 */
export function upgradeOptions(current: Plan | null | undefined, plans: PublicPlan[]): PublicPlan[] {
  const paid = plans.filter((p) => !p.isDefault && p.priceMinor > 0);
  if (!current || current.isDefault) return paid;
  return paid.filter((p) => p.sortOrder > current.sortOrder);
}
