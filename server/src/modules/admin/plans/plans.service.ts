import { and, eq, inArray, ne } from "drizzle-orm";
import { db, type DbOrTx } from "../../../db";
import { plans, planLimits } from "../../../db/schema";
import { PlanLimitType, PlanBillingInterval } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { getPlanLimits } from "../../plans/api";
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
  browserExtension: true,
  directShares: true,
  privateShareRequests: true,
  passwordProtectedShares: true,
  advancedSearch: true,
  vault: true,
  emailCampaigns: true,
  dataExport: true,
  aiEventDetection: true,
  shareAnalyticsDaily: true,
  shareAnalyticsViewers: true,
  insightsFullHistory: true,
};

// What each hosted plan unlocks. All hosted plans run on supplied AI (managedAi); hosted users
// never add keys.
const FREE_FEATURES: Record<string, boolean> = {
  ...ALL_FEATURES,
  vault: false,
  passwordProtectedShares: false,
  directShares: false,
  privateShareRequests: false,
  shareAnalyticsDaily: false,
  shareAnalyticsViewers: false,
  insightsFullHistory: false,
  calendarSync: false,
  aiEventDetection: false,
  batchOperations: false,
  managedAi: true,
};
const LITE_FEATURES: Record<string, boolean> = {
  ...FREE_FEATURES,
  vault: true,
  passwordProtectedShares: true,
  shareAnalyticsDaily: true,
  insightsFullHistory: true,
  calendarSync: true,
  aiEventDetection: true,
  batchOperations: true,
};
const PRO_FEATURES: Record<string, boolean> = { ...ALL_FEATURES, managedAi: true };

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
    [PlanLimitType.IMPORT_MONTHLY_COUNT]: null,
    [PlanLimitType.WEB_SEARCH_MONTHLY]: null,
    ...values,
  };
  return Object.entries(all).map(([limitType, limitValue]) => ({ limitType: limitType as PlanLimitType, limitValue }));
}

// Free, Lite and Pro differ by volume, monthly AI and features; admins edit values without a
// deploy. Prices aren't seeded (paid plans start at 0: "Price coming soon", checkout refuses) until
// an admin sets one.
const LITE_LIMITS = limits({
  [PlanLimitType.STORAGE_MB]: 5 * MB_PER_GB,
  [PlanLimitType.MAX_FILE_MB]: 50,
  [PlanLimitType.PUBLIC_SHARE_COUNT]: 100,
  [PlanLimitType.AI_MONTHLY_SAVES]: 500,
  [PlanLimitType.AI_MONTHLY_QUERIES]: 250,
  [PlanLimitType.WEB_SEARCH_MONTHLY]: 100,
});
const PRO_LIMITS = limits({
  [PlanLimitType.STORAGE_MB]: 15 * MB_PER_GB,
  [PlanLimitType.MAX_FILE_MB]: 100,
  [PlanLimitType.AI_MONTHLY_SAVES]: 2000,
  [PlanLimitType.AI_MONTHLY_QUERIES]: 1000,
  [PlanLimitType.WEB_SEARCH_MONTHLY]: 500,
});

const HOSTED_PLANS: DefaultPlanSeed[] = [
  {
    key: "free",
    name: "Free",
    description: "The essentials, with AI we supply: AI processing for 100 saves and 30 Ask questions a month.",
    priceMinor: 0,
    currency: "usd",
    billingInterval: PlanBillingInterval.MONTHLY,
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    limits: limits({
      [PlanLimitType.MEMORY_COUNT]: 2000,
      [PlanLimitType.STORAGE_MB]: 500,
      [PlanLimitType.MAX_FILE_MB]: 25,
      [PlanLimitType.COLLECTION_COUNT]: 20,
      [PlanLimitType.PUBLIC_SHARE_COUNT]: 5,
      [PlanLimitType.AI_MONTHLY_SAVES]: 100,
      [PlanLimitType.AI_MONTHLY_QUERIES]: 30,
      [PlanLimitType.IMPORT_MONTHLY_COUNT]: 1,
      [PlanLimitType.WEB_SEARCH_MONTHLY]: 10,
    }),
    features: FREE_FEATURES,
  },
  // Two paid plans, monthly or yearly; sortOrder ranks upgrades (Lite monthly < Lite yearly < Pro
  // monthly < Pro yearly). Pro keeps its "ai-*" keys (product IDs and assignments point at them).
  ...(["monthly", "yearly"] as const).flatMap((interval, i) => {
    const billingInterval = interval === "monthly" ? PlanBillingInterval.MONTHLY : PlanBillingInterval.YEARLY;
    return [
      {
        key: `lite-${interval}`,
        name: "Lite",
        description: "Unlimited memories, 5 GB of storage, the private vault and bulk actions, and AI processing for 500 saves and 250 Ask questions a month.",
        priceMinor: 0,
        currency: "usd",
        billingInterval,
        isDefault: false,
        isActive: true,
        sortOrder: 1 + i,
        limits: LITE_LIMITS,
        features: LITE_FEATURES,
      },
      {
        key: `ai-${interval}`,
        name: "Pro",
        description: "Everything, with 15 GB of storage, unlimited public links, and AI processing for 2,000 saves and 1,000 Ask questions a month.",
        priceMinor: 0,
        currency: "usd",
        billingInterval,
        isDefault: false,
        isActive: true,
        sortOrder: 3 + i,
        limits: PRO_LIMITS,
        features: PRO_FEATURES,
      },
    ];
  }),
];

// Plans no longer offered: db:plans:reset switches them off (never deletes), so current holders
// keep them until their subscription ends.
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
 * Idempotent (onConflictDoNothing); run by `pnpm db:seed` and every self-hosted start. Never
 * overwrites admin edits.
 */
/**
 * `pnpm db:plans:reset`: writes the default plans' names, descriptions, features and limits
 * (inserting missing ones). Never touches price, currency, isActive or isDefault, except that
 * retired plans are switched off.
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
  // Image reads are part of a save's AI processing now, so the old limit rows go.
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
    // Only one signup default: flip the others first.
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
        // Always set, so .set() is never empty (Drizzle throws on a limits-only PATCH).
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
