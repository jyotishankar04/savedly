import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { PlanAssignmentStatus, PlanBillingInterval } from "../enums";
import { users } from "./identity";
import { planAssignmentSourceEnum, planAssignmentStatusEnum, planBillingIntervalEnum, planLimitTypeEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 20c. Billing (hosted only — modules/billing)
//     billing_customers: the payment provider's customer id per user, needed
//     to open the provider's billing portal. billing_events: every webhook
//     event id already handled, so a replayed delivery is a no-op.
// -----------------------------------------------------------------------------
export const billingCustomers = pgTable("billing_customers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 30 }).notNull(),
  customerId: varchar("customer_id", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const billingEvents = pgTable("billing_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  provider: varchar("provider", { length: 30 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// -----------------------------------------------------------------------------
// 24. Plans Table (admin-editable pricing tiers — Free/Plus/Pro today, but not
//     a hardcoded enum: an admin can rename, reprice, or add a tier without a
//     deploy. `key` is the stable machine identifier other code references;
//     `name` is the only field an admin is expected to change often.)
// -----------------------------------------------------------------------------
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 50 }).notNull().unique(), // e.g. "free", "plus", "pro" — never renamed
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    priceMinor: integer("price_minor").notNull().default(0), // cents
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    billingInterval: planBillingIntervalEnum("billing_interval")
      .notNull()
      .default(PlanBillingInterval.MONTHLY),
    isActive: boolean("is_active").notNull().default(true),
    // Auto-assigned on signup. Only one plan may be default at a time —
    // enforced in the service layer with the same flip-others-first
    // transaction pattern as announcements.isActive.
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // Admin-editable, boolean/on-off perks distinct from the numeric
    // PlanLimitType quota system above (memory_count etc.). Record-keeping
    // only: every plan gets every feature — plans differ only by volume and
    // included AI (see admin/plans/plans.service.ts's DEFAULT_PLANS).
    features: jsonb("features").$type<Record<string, boolean>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_plans_active_sort").on(table.isActive, table.sortOrder)]
);

// -----------------------------------------------------------------------------
// 25. Plan Limits Table (one row per plan per limit type — admin-editable
//     numbers, not code. `limitValue: null` means unlimited.)
// -----------------------------------------------------------------------------
export const planLimits = pgTable(
  "plan_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    limitType: planLimitTypeEnum("limit_type").notNull(),
    limitValue: integer("limit_value"), // null = unlimited
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("uq_plan_limits_plan_type").on(table.planId, table.limitType)]
);

// -----------------------------------------------------------------------------
// 26. User Plan Assignments Table ("subscription" without live billing — a
//     history, not a singleton, same as announcements. Only one ACTIVE
//     assignment per user is enforced in the service layer: inserting a new
//     active row first flips any existing active row to SUPERSEDED. Effective
//     plan resolves lazily — WHERE userId=X AND status='active' AND
//     (endsAt IS NULL OR endsAt > now()), falling back to plans.isDefault.)
// -----------------------------------------------------------------------------
export const userPlanAssignments = pgTable(
  "user_plan_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: planAssignmentStatusEnum("status").notNull().default(PlanAssignmentStatus.ACTIVE),
    source: planAssignmentSourceEnum("source").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }), // null = doesn't expire
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }), // admin who granted it manually
    reason: text("reason"), // admin note, e.g. "30-day Pro goodwill grant"
    // Polymorphic, same style as adminAuditLogs.targetType/targetId — e.g.
    // sourceRefType "referral_conversion" | "coupon_redemption" | "transaction".
    sourceRefType: varchar("source_ref_type", { length: 50 }),
    sourceRefId: varchar("source_ref_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_user_plan_assignments_user_status").on(table.userId, table.status),
    index("idx_user_plan_assignments_ends_at").on(table.endsAt),
  ]
);
