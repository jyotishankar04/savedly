import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./identity";
import { notificationTypeEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 14c. Notifications
// -----------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    actionUrl: varchar("action_url", { length: 500 }),
    // Deliberately no FK — unlike a share row, a notification should outlive
    // the thing it refers to ("X shared Y with you" still reads fine after Y
    // is deleted, and silently vanishing history is worse than a dead link).
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
    index("idx_notifications_user_unread").on(table.userId).where(sql`${table.readAt} IS NULL`),
  ]
);
