import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { memories } from "./library";
import { importItemStatusEnum, importSourceTypeEnum } from "./pg-enums";

// One row per bookmarks-file or URL-list import: a parent summary with N child rows.
export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceType: importSourceTypeEnum("source_type").notNull(),
    totalCount: integer("total_count").notNull(),
    createdCount: integer("created_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_import_batches_user_created").on(table.userId, table.createdAt)]
);

// One row per URL in a batch. memoryId is set null on delete so the history survives.
export const importItems = pgTable(
  "import_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    status: importItemStatusEnum("status").notNull(),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_import_items_batch_status").on(table.batchId, table.status)]
);
