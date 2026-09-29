import { and, eq, inArray, ne } from "drizzle-orm";
import { db, type DbOrTx } from "../../../db";
import { plans, planLimits } from "../../../db/schema";
import { PlanLimitType, PlanBillingInterval } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { getPlanLimits } from "../../plans/plans.service";
import type { CreatePlanInput, UpdatePlanInput } from "./plans.schema";

interface DefaultPlanSeed {
  key: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  billingInterval: PlanBillingInterval;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  limits: { limitType: PlanLimitType; limitValue: number | null }[];
  features: Record<string, boolean>;
}

const ALL_FEATURES: Record<string, boolean> = {
  batchOperations: true,
  importExport: true,
  calendarSync: true,
  calendarMicrosoft: true,
  browserExtension: true,
  directShares: true,
  privateShareRequests: true,
  passwordProtectedShares: true,
  advancedSearch: true,
  vault: true,
  emailCampaigns: true,
  dataExport: true,
  aiEventDetection: true,
};

const MB_PER_GB = 1024;

function limits(values: Partial<Record<PlanLimitType, number | null>>): DefaultPlanSeed["limits"] {
  const all: Partial<Record<PlanLimitType, number | null>> = {
    [PlanLimitType.MEMORY_COUNT]: null,
    [PlanLimitType.STORAGE_MB]: null,
    [PlanLimitType.MAX_FILE_MB]: null,
    [PlanLimitType.COLLECTION_COUNT]: null,
    [PlanLimitType.PUBLIC_SHARE_COUNT]: null,
    [PlanLimitType.AI_MONTHLY_SAVES]: null,
    [PlanLimitType.AI_MONTHLY_QUERIES]: null,
    ...values,
  };
  return Object.entries(all).map(([limitType, limitValue]) => ({ limitType: limitType as PlanLimitType, limitValue }));
}

// Hosted plans. Every plan gets every feature — they differ only by volume
// and by how much AI the platform supplies on its own key (the AI_MONTHLY_*
// quotas; anyone's own key is never limited). The values are starting points
// an admin edits in Admin -> Plans & Limits without a deploy.
//
// Prices are deliberately NOT seeded: paid plans start at 0, which the
// pricing page shows as "Price coming soon" and checkout refuses, until an
// admin sets the real price (matching the payment provider's product).
const AI_LIMITS = limits({
  [PlanLimitType.STORAGE_MB]: 25 * MB_PER_GB,
  [PlanLimitType.MAX_FILE_MB]: 100,
  [PlanLimitType.AI_MONTHLY_SAVES]: 2000,
  [PlanLimitType.AI_MONTHLY_QUERIES]: 1000,
});

const HOSTED_PLANS: DefaultPlanSeed[] = [
  {
    key: "free",
    name: "Free",
    description: "Every feature on your own AI key, with a small monthly taste of included AI.",
    priceMinor: 0,
    currency: "usd",
    billingInterval: PlanBillingInterval.MONTHLY,
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    limits: limits({
      [PlanLimitType.MEMORY_COUNT]: 2000,
      [PlanLimitType.STORAGE_MB]: 1 * MB_PER_GB,
      [PlanLimitType.MAX_FILE_MB]: 25,
      [PlanLimitType.PUBLIC_SHARE_COUNT]: 5,
      [PlanLimitType.AI_MONTHLY_SAVES]: 50,
      [PlanLimitType.AI_MONTHLY_QUERIES]: 20,
    }),
    features: ALL_FEATURES,
  },
  // One paid plan, billed monthly or yearly.
  ...(["monthly", "yearly"] as const).map((interval, i) => ({
    key: `ai-${interval}`,
    name: "AI included",
    description: "Unlimited memories, 25 GB of storage, and AI we supply: AI processing for 2,000 saves and 1,000 Ask questions a month.",
    priceMinor: 0,
    currency: "usd",
    billingInterval: interval === "monthly" ? PlanBillingInterval.MONTHLY : PlanBillingInterval.YEARLY,
    isDefault: false,
    isActive: true,
    sortOrder: 1 + i,
    limits: AI_LIMITS,
    // AI is part of the plan: always ours, nothing for the user to set up.
    features: { ...ALL_FEATURES, managedAi: true },
  })),
];

// Plans that used to be offered. db:plans:reset switches them off (never
// deletes them), so anyone still assigned one keeps resolving to it until
// their subscription ends, but nobody new can buy it.
const RETIRED_HOSTED_PLAN_KEYS = ["own-key-monthly", "own-key-yearly"];
const RETIRED_LIMIT_TYPES = [PlanLimitType.AI_MONTHLY_VISION_QUERIES];

// A self-hosted install has one plan, and nothing is limited.
const SELF_HOSTED_PLANS: DefaultPlanSeed[] = [
  {
    key: "self-hosted",
    name: "Self-hosted",
    description: "Your own install: every feature, unlimited.",
    priceMinor: 0,
    currency: "usd",
    billingInterval: PlanBillingInterval.MONTHLY,
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    limits: limits({}),
    features: ALL_FEATURES,
  },
];

/**
 * Idempotent (onConflictDoNothing on both the plan and each limit), same
 * pattern as seedDefaultFlags — run via `pnpm db:seed` (src/db/seed.ts), and
 * on every start of a self-hosted container (db/bootstrap.ts). Never overwrites a value an admin has since
 * edited, unlike upsertLimits below (which is deliberately an overwrite,
 * for admin edits).
 */
/**
 * Writes the default plans' names, descriptions, features and limits over
 * what's in the database (inserting any plan that's missing), for moving an
 * existing database onto new defaults — `pnpm db:plans:reset`. Never touches
 * a plan's price, currency, isActive or isDefault, which are admin decisions —
 * except that retired plans are switched off.
 */
export async function resetPlanDefaults(): Promise<string[]> {
  const touched: string[] = [];
  if (!env.SELF_HOSTED) {
    const retired = await db
      .update(plans)
      // Ranked below every paid plan, so anyone still on one can move up to any of them.
      .set({ isActive: false, sortOrder: 0, updatedAt: new Date() })
      .where(inArray(plans.key, RETIRED_HOSTED_PLAN_KEYS))
      .returning({ key: plans.key });
    touched.push(...retired.map((p) => `${p.key} (retired)`));
  }
  // Image reads used to have their own allowance; they're part of AI
  // processing for a save now, so the old limit rows go.
  await db.delete(planLimits).where(inArray(planLimits.limitType, RETIRED_LIMIT_TYPES));
  for (const seed of env.SELF_HOSTED ? SELF_HOSTED_PLANS : HOSTED_PLANS) {
    await db
      .insert(plans)
      .values({
        key: seed.key,
        name: seed.name,
        description: seed.description,
        priceMinor: seed.priceMinor,
        currency: seed.currency,
        billingInterval: seed.billingInterval,
        isDefault: seed.isDefault,
        isActive: seed.isActive,
        sortOrder: seed.sortOrder,
        features: seed.features,
      })
      .onConflictDoUpdate({
        target: plans.key,
        set: { name: seed.name, description: seed.description, features: seed.features, sortOrder: seed.sortOrder },
      });

    const [plan] = await db.select().from(plans).where(eq(plans.key, seed.key)).limit(1);
    if (!plan) continue;
    await upsertLimits(db, plan.id, seed.limits);
    touched.push(seed.key);
  }
  return touched;
}

export async function seedDefaultPlans(): Promise<void> {
  for (const seed of env.SELF_HOSTED ? SELF_HOSTED_PLANS : HOSTED_PLANS) {
    await db
      .insert(plans)
      .values([
        {
          key: seed.key,
          name: seed.name,
          description: seed.description,
          priceMinor: seed.priceMinor,
          currency: seed.currency,
          billingInterval: seed.billingInterval,
          isDefault: seed.isDefault,
          isActive: seed.isActive,
          sortOrder: seed.sortOrder,
          features: seed.features,
        },
      ])
      .onConflictDoNothing({ target: plans.key });

    const [plan] = await db.select().from(plans).where(eq(plans.key, seed.key)).limit(1);
    if (!plan) continue;

    for (const limit of seed.limits) {
      await db
        .insert(planLimits)
        .values({ planId: plan.id, limitType: limit.limitType, limitValue: limit.limitValue })
        .onConflictDoNothing({ target: [planLimits.planId, planLimits.limitType] });
    }
  }
}

export async function listAllPlans() {
  const rows = await db.select().from(plans).orderBy(plans.sortOrder);
  return Promise.all(rows.map(async (plan) => ({ ...plan, limits: await getPlanLimits(plan.id) })));
}

async function upsertLimits(tx: DbOrTx, planId: string, limits: NonNullable<CreatePlanInput["limits"]>) {
  for (const limit of limits) {
    await tx
      .insert(planLimits)
      .values({ planId, limitType: limit.limitType, limitValue: limit.limitValue })
      .onConflictDoUpdate({
        target: [planLimits.planId, planLimits.limitType],
        set: { limitValue: limit.limitValue },
      });
  }
}

export async function createPlan(input: CreatePlanInput, adminUserId: string, ipAddress?: string) {
  return db.transaction(async (tx) => {
    // Only one plan may be the signup default at a time — same
    // flip-others-first pattern as announcements.isActive.
    if (input.isDefault) {
      await tx.update(plans).set({ isDefault: false }).where(eq(plans.isDefault, true));
    }

    const [plan] = await tx
      .insert(plans)
      .values({
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        priceMinor: input.priceMinor,
        currency: input.currency,
        billingInterval: input.billingInterval,
        isActive: input.isActive,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
        features: input.features,
      })
      .returning();

    if (input.limits?.length) {
      await upsertLimits(tx, plan.id, input.limits);
    }

    await logAdminAction({
      adminUserId,
      action: "plan.created",
      targetType: "plan",
      targetId: plan.id,
      afterValue: { ...plan, limits: input.limits ?? [] },
      ipAddress,
    });

    return plan;
  });
}

export async function updatePlan(planId: string, input: UpdatePlanInput, adminUserId: string, ipAddress?: string) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!before) {
      throw new AppError("Plan not found", 404, "NOT_FOUND");
    }

    if (input.isDefault) {
      await tx.update(plans).set({ isDefault: false }).where(and(eq(plans.isDefault, true), ne(plans.id, planId)));
    }

    const [after] = await tx
      .update(plans)
      .set({
        // Always present so .set() never receives an empty object — a
        // limits-only PATCH (the admin UI's per-limit edit, and any
        // scripted plan-limit update) would otherwise pass nothing here at
        // all, and Drizzle throws "No values to set" on an empty .set().
        updatedAt: new Date(),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priceMinor !== undefined ? { priceMinor: input.priceMinor } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.billingInterval !== undefined ? { billingInterval: input.billingInterval } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.features !== undefined ? { features: input.features } : {}),
      })
      .where(eq(plans.id, planId))
      .returning();

    if (input.limits?.length) {
      await upsertLimits(tx, planId, input.limits);
    }

    const limitsAfter = await getPlanLimits(planId, tx);

    await logAdminAction({
      adminUserId,
      action: "plan.updated",
      targetType: "plan",
      targetId: planId,
      beforeValue: before,
      afterValue: { ...after, limits: limitsAfter },
      ipAddress,
    });

    return { ...after, limits: limitsAfter };
  });
}
