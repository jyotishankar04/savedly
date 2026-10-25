import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./identity";

// Global key/value config (auth toggles, signups, maintenance mode, ...), so a new flag needs no
// migration. Read through feature-flags.service.ts getters.
export const featureFlags = pgTable(
  "feature_flags",
  {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: jsonb("value").notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // e.g. "auth", "system", "experimental"
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_feature_flags_category").on(table.category)]
);

// Self-hosted only: infrastructure an admin configures in Admin -> Infrastructure, one row per
// section. Secret fields are encrypted in `secret_value` and never returned. Hosted production
// never reads this table.
export const instanceSettings = pgTable("instance_settings", {
  section: varchar("section", { length: 50 }).primaryKey(),
  value: jsonb("value").notNull().default({}),
  secretValue: text("secret_value"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Who did which admin action, to what, and when; written by every mutating admin endpoint.
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g. "user.role.granted", "flag.updated"
    targetType: varchar("target_type", { length: 50 }), // e.g. "user", "feature_flag", "announcement"
    targetId: varchar("target_id", { length: 255 }), // polymorphic — not a strict FK
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_admin_audit_logs_admin_user_created").on(table.adminUserId, table.createdAt),
    index("idx_admin_audit_logs_target").on(table.targetType, table.targetId),
  ]
);
