import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vector, tsvector, EMBEDDING_DIMENSIONS } from "../pgvector-type";
import { CollectionSource, MemoryStatus, HighlightColor } from "../enums";
import { users } from "./identity";
import { collectionSourceEnum, highlightColorEnum, memoryStatusEnum, memoryTypeEnum } from "./pg-enums";

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    icon: varchar("icon", { length: 50 }).notNull().default("📁"),
    description: text("description"),
    // "system" collections (onboarding, AI groupings) are hidden behind a toggle and don't count
    // toward the limit; conversion to "user" is one-way.
    source: collectionSourceEnum("source").notNull().default(CollectionSource.USER),
    convertedFromSystemAt: timestamp("converted_from_system_at", { withTimezone: true }),
    // Hides the collection, and cascades isVaulted onto its memories (vault.service.ts), until the
    // PIN is unlocked.
    isVaulted: boolean("is_vaulted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_collections_user_id").on(table.userId),
    index("idx_collections_user_source").on(table.userId, table.source),
  ]
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: memoryTypeEnum("type").notNull(),
    // Enrichment progress only; the memory exists once POST /memories returns.
    status: memoryStatusEnum("status").notNull().default(MemoryStatus.PROCESSING),
    title: text("title").notNull().default("Untitled"),
    url: text("url"),
    // Normalized for duplicate detection (normalize-url.ts); null for non-links.
    normalizedUrl: text("normalized_url"),
    content: text("content"),
    description: text("description"),
    source: varchar("source", { length: 100 }),
    faviconUrl: text("favicon_url"),
    previewImageUrl: text("preview_image_url"),
    keywords: text("keywords").array(),
    // URL capture and preview fields (docs/URL_CAPTURE_AND_PREVIEW.md): null until ingestion runs,
    // and for non-links.
    previewStatus: text("preview_status"),
    previewSource: text("preview_source"),
    platform: text("platform"),
    resourceType: text("resource_type"),
    canonicalUrl: text("canonical_url"),
    // Diagnostics only, never shown directly (UI says "Preview unavailable").
    fetchStatus: text("fetch_status"),
    captureMethod: text("capture_method"),
    // Null until checked, then "none", "pending" or "kept". duplicateOfId has no FK: a hint that
    // may outlive the original.
    duplicateStatus: varchar("duplicate_status", { length: 16 }),
    duplicateOfId: uuid("duplicate_of_id"),
    // Metadata from the extension's POST /:id/browser-capture, kept for re-merging on /refresh-preview.
    browserCapture: jsonb("browser_capture"),
    // A social post or video as read from its platform (author, text, media, transcript); null for
    // other links.
    socialPost: jsonb("social_post"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    inTrash: boolean("in_trash").notNull().default(false),
    // When it became true; null otherwise. Starts the 15-day window before trash-purge.job.ts deletes it.
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    // Inbox: null = unread. Links, videos, documents and pictures start unread; notes and voice
    // memos start read. A due reminder clears it.
    readAt: timestamp("read_at", { withTimezone: true }),
    // Snoozed (hidden from the Inbox) until this time; then the reminder job makes it unread,
    // notifies, sets remindedAt and clears this.
    remindAt: timestamp("remind_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    // Hidden until the PIN is unlocked; also set when in a vaulted collection, so reads needn't
    // join collection_memories.
    isVaulted: boolean("is_vaulted").notNull().default(false),
    // User-set date this memory is about; null means none. Powers "Add to calendar" (Google link or .ics).
    eventAt: timestamp("event_at", { withTimezone: true }),
    // Event length in minutes; null means the 1-hour default.
    eventDurationMinutes: integer("event_duration_minutes"),
    // AI-guessed date (DetectEvent), never user-set; becomes eventAt only when the user confirms
    // via updateMemory.
    suggestedEventAt: timestamp("suggested_event_at", { withTimezone: true }),
    // DetectEvent confidence (0-1); only above EVENT_DETECTION_CONFIDENCE_THRESHOLD does it notify.
    eventDetectionConfidence: real("event_detection_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    // Filled asynchronously by ingestion after create; nullable until then.
    documentEmbedding: vector("document_embedding", EMBEDDING_DIMENSIONS),
    // Filled by a DB trigger from title/description/intent/content; the app never writes it.
    ftsTokens: tsvector("fts_tokens"),
    resourceCategory: text("resource_category"),
    inferredIntent: text("inferred_intent"),
    intentConfidence: real("intent_confidence"),
    // Open-vocabulary content type ("recipe", "task", ...) plus the fields DetectContentType extracted.
    contentType: text("content_type"),
    extractedFields: jsonb("extracted_fields"),
    // What the web research step found ("What Savedly understood"); null when it didn't search.
    // Every highlight's passage and note, so keyword search finds a memory by what was highlighted.
    highlightsText: text("highlights_text"),
    webResearch: jsonb("web_research").$type<{ query: string; findings: string; kind: string | null; sources: { title: string; url: string }[]; at: string }>(),
  },
  (table) => [
    index("idx_memories_user_id").on(table.userId),
    index("idx_memories_user_created").on(table.userId, table.createdAt),
    index("idx_memories_user_normalized_url").on(table.userId, table.normalizedUrl),
    // The reminder job's sweep, and the Inbox's unread list.
    index("idx_memories_remind_at").on(table.remindAt).where(sql`${table.remindAt} IS NOT NULL`),
    index("idx_memories_user_unread").on(table.userId, table.createdAt).where(sql`${table.readAt} IS NULL`),
    // Partial: the purge query only looks at trashed rows, and almost every memory isn't.
    index("idx_memories_trashed_at").on(table.trashedAt).where(sql`${table.inTrash} = true`),
  ]
);

export const collectionMemories = pgTable(
  "collection_memories",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.memoryId] }),
    index("idx_collection_memories_memory_id").on(table.memoryId),
  ]
);

export const memoryHighlights = pgTable(
  "memory_highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    prefix: text("prefix").notNull().default(""),
    suffix: text("suffix").notNull().default(""),
    color: highlightColorEnum("color").notNull().default(HighlightColor.YELLOW),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_memory_highlights_memory").on(table.memoryId), index("idx_memory_highlights_user").on(table.userId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uq_tags_user_name").on(table.userId, table.name)]
);

export const memoryTags = pgTable(
  "memory_tags",
  {
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.memoryId, table.tagId] }),
    index("idx_memory_tags_tag_id").on(table.tagId),
  ]
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_attachments_memory_id").on(table.memoryId)]
);

export const memoryChunks = pgTable(
  "memory_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkContent: text("chunk_content").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", EMBEDDING_DIMENSIONS).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_memory_chunks_user_memory").on(table.userId, table.memoryId)]
);
