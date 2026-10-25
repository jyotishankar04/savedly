import { db, type DbOrTx } from "../../db";
import { PlanLimitType } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { env } from "../../config/env";
import { getPlanLimits, resolveEffectivePlan } from "./plans.catalog";
import { getCurrentUsage } from "./plans.usage";

// Limits a plan without its own row gets, instead of unlimited: each web
// lookup is a paid call, so a plan made before the limit existed (or a
// retired one someone is still on) stays at the Free level until an admin
// sets it.
const LIMIT_WHEN_UNSET: Partial<Record<PlanLimitType, number>> = {
  [PlanLimitType.WEB_SEARCH_MONTHLY]: 10,
};

interface LimitCheck {
  ok: boolean;
  planName: string;
  limitValue: number | null;
  current: number;
}

async function checkLimit(userId: string, limitType: PlanLimitType, delta: number, dbClient: DbOrTx = db): Promise<LimitCheck> {
  // Nothing is limited on a self-hosted install.
  if (env.SELF_HOSTED) return { ok: true, planName: "Self-hosted", limitValue: null, current: 0 };

  const { plan } = await resolveEffectivePlan(userId, dbClient);
  const set = (await getPlanLimits(plan.id, dbClient))[limitType];
  // A missing row normally means unlimited; for limits that cost us money per use, it means the Free amount instead.
  const limitValue = set !== undefined ? set : (LIMIT_WHEN_UNSET[limitType] ?? null);
  if (limitValue === null) return { ok: true, planName: plan.name, limitValue: null, current: 0 }; // unlimited

  const current = await getCurrentUsage(userId, limitType, dbClient);
  return { ok: current + delta <= limitValue, planName: plan.name, limitValue, current };
}

const LIMIT_MESSAGES: Partial<Record<PlanLimitType, (limit: number, plan: string) => string>> = {
  [PlanLimitType.MEMORY_COUNT]: (n, p) => `You've reached the ${p} plan's ${n.toLocaleString("en-US")} saved memories. Upgrade to keep saving.`,
  [PlanLimitType.STORAGE_MB]: (n, p) => `This file would go over the ${p} plan's ${formatMb(n)} of storage.`,
  [PlanLimitType.PUBLIC_SHARE_COUNT]: (n, p) =>
    `The ${p} plan includes ${n} public ${n === 1 ? "link" : "links"}. Make one private or upgrade for more.`,
  [PlanLimitType.COLLECTION_COUNT]: (n, p) => `The ${p} plan includes ${n} collections of your own. Upgrade for unlimited.`,
  [PlanLimitType.WEB_SEARCH_MONTHLY]: (n, p) =>
    `The ${p} plan includes ${n} web ${n === 1 ? "lookup" : "lookups"} a month. Upgrade for more, or they come back next month.`,
  [PlanLimitType.IMPORT_MONTHLY_COUNT]: (n, p) =>
    `The ${p} plan includes ${n} ${n === 1 ? "import" : "imports"} a month. Upgrade for unlimited imports, or try again next month.`,
};

function formatMb(mb: number): string {
  return mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${mb} MB`;
}

/**
 * Throws 403 PLAN_LIMIT_EXCEEDED if adding `delta` to the user's current
 * usage of `limitType` would go over their plan. Null limit = unlimited, and
 * nothing is ever limited on a self-hosted install.
 */
export async function assertWithinLimit(userId: string, limitType: PlanLimitType, delta = 1, dbClient: DbOrTx = db): Promise<void> {
  const result = await checkLimit(userId, limitType, delta, dbClient);
  if (result.ok) return;
  const message =
    LIMIT_MESSAGES[limitType]?.(result.limitValue!, result.planName) ??
    `This would go over your ${result.planName} plan's limit (${result.limitValue}).`;
  throw new AppError(message, 403, "PLAN_LIMIT_EXCEEDED", {
    limitType,
    limitValue: result.limitValue,
    current: result.current,
    delta,
  });
}

/** How many more of `limitType` the user's plan allows. Null = unlimited. For callers that add as many as fit. */
export async function remainingWithinLimit(userId: string, limitType: PlanLimitType, dbClient: DbOrTx = db): Promise<number | null> {
  const result = await checkLimit(userId, limitType, 0, dbClient);
  return result.limitValue === null ? null : Math.max(0, result.limitValue - result.current);
}

/** Non-throwing counterpart, for callers that degrade instead of failing (e.g. included-AI quotas). */
export async function isWithinLimit(userId: string, limitType: PlanLimitType, delta = 1, dbClient: DbOrTx = db): Promise<boolean> {
  return (await checkLimit(userId, limitType, delta, dbClient)).ok;
}

/** Throws if a single file is bigger than the plan allows. */
export async function assertFileSizeAllowed(userId: string, fileSizeBytes: number): Promise<void> {
  if (env.SELF_HOSTED) return;
  const { plan } = await resolveEffectivePlan(userId);
  const maxMb = (await getPlanLimits(plan.id))[PlanLimitType.MAX_FILE_MB] ?? null;
  if (maxMb !== null && fileSizeBytes > maxMb * 1024 * 1024) {
    throw new AppError(`Files on the ${plan.name} plan can be up to ${formatMb(maxMb)}.`, 403, "PLAN_LIMIT_EXCEEDED", {
      limitType: PlanLimitType.MAX_FILE_MB,
      limitValue: maxMb,
    });
  }
}
