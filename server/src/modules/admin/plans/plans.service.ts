import { and, eq, ne } from "drizzle-orm";
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
  const all: Record<PlanLimitType, number | null> = {
    [PlanLimitType.MEMORY_COUNT]: null,
    [PlanLimitType.STORAGE_MB]: null,
    [PlanLimitType.MAX_FILE_MB]: null,
    [PlanLimitType.COLLECTION_COUNT]: null,
    [PlanLimitType.PUBLIC_SHARE_COUNT]: null,
    [PlanLimitType.AI_MONTHLY_SAVES]: null,
    [PlanLimitType.AI_MONTHLY_QUERIES]: null,
    [PlanLimitType.AI_MONTHLY_VISION_QUERIES]: null,
    ...values,
  };
  return Object.entries(all).map(([limitType, limitValue]) => ({ limitType: limitType as PlanLimitType, limitValue }));
}

// Hosted plans. Every plan gets every feature — they differ only by volume
// and by how much AI the platform supplies on its own key (the AI_MONTHLY_*
// quotas; anyone's own key is never limited). The values are starting points
// an admin edits in Admin -> Plans & Limits without a deploy.
//
// Prices are deliberately NOT seeded: the paid plans start inactive at 0, and
// stay off the pricing page until an admin sets a real price and activates
// them.
const OWN_KEY_LIMITS = limits({
  [PlanLimitType.STORAGE_MB]: 25 * MB_PER_GB,
  [PlanLimitType.MAX_FILE_MB]: 100,
  [PlanLimitType.AI_MONTHLY_SAVES]: 0,
  [PlanLimitType.AI_MONTHLY_QUERIES]: 0,
  [PlanLimitType.AI_MONTHLY_VISION_QUERIES]: 0,
});
const AI_LIMITS = limits({
  [PlanLimitType.STORAGE_MB]: 25 * MB_PER_GB,
  [PlanLimitType.MAX_FILE_MB]: 100,
  [PlanLimitType.AI_MONTHLY_SAVES]: 2000,
  [PlanLimitType.AI_MONTHLY_QUERIES]: 1000,
  [PlanLimitType.AI_MONTHLY_VISION_QUERIES]: 200,
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
      [PlanLimitType.AI_MONTHLY_VISION_QUERIES]: 10,
    }),
    features: ALL_FEATURES,
  },
  ...(["monthly", "yearly"] as const).flatMap((interval, i) => [
    {
      key: `own-key-${interval}`,
      name: "Own key",
      description: "Unlimited memories and 25 GB of storage. Bring your own AI key; you pay only for hosting.",
      priceMinor: 0,
      currency: "usd",
      billingInterval: interval === "monthly" ? PlanBillingInterval.MONTHLY : PlanBillingInterval.YEARLY,
      isDefault: false,
      isActive: false,
      sortOrder: 1 + i,
      limits: OWN_KEY_LIMITS,
      features: ALL_FEATURES,
    },
    {
      key: `ai-${interval}`,
      name: "AI included",
      description: "Everything in Own key, plus AI we supply: 2,000 saves, 1,000 questions and 200 images a month.",
      priceMinor: 0,
      currency: "usd",
      billingInterval: interval === "monthly" ? PlanBillingInterval.MONTHLY : PlanBillingInterval.YEARLY,
      isDefault: false,
      isActive: false,
      sortOrder: 3 + i,
      limits: AI_LIMITS,
      features: ALL_FEATURES,
    },
  ]),
];

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
