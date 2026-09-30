import { z } from "zod";
import { PlanBillingInterval, PlanLimitType } from "../../../db/enums";

const planLimitInputSchema = z.object({
  limitType: z.nativeEnum(PlanLimitType),
  limitValue: z.coerce.number().int().min(0).nullable(), // null = unlimited
});

export const createPlanSchema = z.object({
  key: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional(),
  priceMinor: z.coerce.number().int().min(0).default(0),
  currency: z.string().length(3).default("usd"),
  billingInterval: z
    .enum([PlanBillingInterval.MONTHLY, PlanBillingInterval.YEARLY, PlanBillingInterval.ONE_TIME])
    .default(PlanBillingInterval.MONTHLY),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  limits: z.array(planLimitInputSchema).optional(),
  features: z.record(z.string(), z.boolean()).default({}),
});

// `key` is intentionally excluded — it's the stable machine identifier
// other code references and is set once at creation, never renamed.
//
// NOT `createPlanSchema.omit({key:true}).partial()` — Zod's `.default()`
// still fires for an omitted field even after `.partial()` wraps it in
// `.optional()`, so every PATCH that left a field out would silently reset
// it to its create-time default (this corrupted `isDefault`/`sortOrder` on
// real rows before the bug was caught). Each field here is redeclared
// without `.default()` so an omitted field actually parses to `undefined`,
// which the service layer correctly treats as "leave unchanged".
export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  priceMinor: z.coerce.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  billingInterval: z
    .enum([PlanBillingInterval.MONTHLY, PlanBillingInterval.YEARLY, PlanBillingInterval.ONE_TIME])
    .optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  limits: z.array(planLimitInputSchema).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
