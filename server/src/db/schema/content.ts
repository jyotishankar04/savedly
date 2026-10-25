import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { AnnouncementDisplayMode, WhatsNewKind, RoadmapStatus, BlogPostStatus, AnnouncementType } from "../enums";
import { users } from "./identity";
import { announcementDisplayModeEnum, announcementTypeEnum, blogPostStatusEnum, roadmapStatusEnum, whatsNewKindEnum } from "./pg-enums";

// Launch/update banners and countdowns. A history; only one active at a time, enforced in the service.
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: announcementTypeEnum("type").notNull().default(AnnouncementType.ANNOUNCEMENT),
    // "full_page" blocks every page except /admin, like maintenance mode; for launch splashes.
    displayMode: announcementDisplayModeEnum("display_mode").notNull().default(AnnouncementDisplayMode.BANNER),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    targetDate: timestamp("target_date", { withTimezone: true }),
    ctaLabel: varchar("cta_label", { length: 100 }),
    ctaUrl: text("cta_url"),
    isActive: boolean("is_active").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_announcements_active").on(table.isActive),
    index("idx_announcements_created_at").on(table.createdAt),
  ]
);

// The public blog, Markdown written by admins; only published posts are served publicly.
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The post's address: /blog/<slug>. Lowercase words joined by hyphens.
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    // One or two sentences for the post list, link previews and search results.
    excerpt: text("excerpt"),
    // Markdown.
    content: text("content").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    status: blogPostStatusEnum("status").notNull().default(BlogPostStatus.DRAFT),
    // The byline, as text: a post keeps its author's name if their account goes.
    authorName: varchar("author_name", { length: 120 }),
    // Set the first time a post is published; an admin may change it to backdate.
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_blog_posts_status_published").on(table.status, table.publishedAt)]
);

// Public roadmap, ordered by sortOrder per status. The slug never changes, so votes survive renames.
export const roadmapItems = pgTable(
  "roadmap_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 60 }).notNull().unique(),
    status: roadmapStatusEnum("status").notNull().default(RoadmapStatus.NEXT),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    // The part of Savedly it lands in: "Extension", "Inbox"…
    area: varchar("area", { length: 40 }),
    points: jsonb("points").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_roadmap_items_status_order").on(table.status, table.sortOrder)]
);

// One vote per person per roadmap item; deleted with the item.
export const roadmapVotes = pgTable(
  "roadmap_votes",
  {
    itemSlug: varchar("item_slug", { length: 60 })
      .notNull()
      .references(() => roadmapItems.slug, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemSlug, table.userId] }), index("idx_roadmap_votes_user_id").on(table.userId)]
);

// Cards in the "What's new" popup. Any number can be active; they show in sort_order.
export const whatsNewItems = pgTable(
  "whats_new_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: whatsNewKindEnum("kind").notNull().default(WhatsNewKind.NEW),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body"),
    // Short points shown as a list under the body.
    bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
    imageUrl: text("image_url"),
    ctaLabel: varchar("cta_label", { length: 60 }),
    ctaUrl: text("cta_url"),
    isActive: boolean("is_active").notNull().default(true),
    // Lower comes first in the stack.
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_whats_new_items_active_order").on(table.isActive, table.sortOrder)]
);
