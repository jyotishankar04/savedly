import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { PlanAssignmentStatus, PlanBillingInterval } from "../enums";
import { users } from "./identity";
import { planAssignmentSourceEnum, planAssignmentStatusEnum, planBillingIntervalEnum, planLimitTypeEnum } from "./pg-enums";

// Hosted only: the provider's customer id per user, and handled webhook ids (so a replay is a no-op).
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

// Admin-editable pricing tiers. `key` is the stable id other code uses; `name` is the display name.
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
    // Auto-assigned on signup; only one default, enforced in the service.
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // On/off perks, separate from the numeric limits. Record-keeping only: every plan gets every feature.
    features: jsonb("features").$type<Record<string, boolean>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_plans_active_sort").on(table.isActive, table.sortOrder)]
);

// One row per plan per limit type. `limitValue: null` means unlimited.
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

// Plan history per user; one ACTIVE row (the service supersedes the old). Effective plan: active
// and unexpired, else the default.
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
    // Polymorphic reference, like adminAuditLogs.targetType/targetId.
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
