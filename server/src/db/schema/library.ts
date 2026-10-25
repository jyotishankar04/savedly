import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vector, tsvector, EMBEDDING_DIMENSIONS } from "../pgvector-type";
import { CollectionSource, MemoryStatus, HighlightColor } from "../enums";
import { users } from "./identity";
import { collectionSourceEnum, highlightColorEnum, memoryStatusEnum, memoryTypeEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 12. Collections Table
// -----------------------------------------------------------------------------
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
    // "system" collections (onboarding defaults, AI groupings) are hidden behind a toggle and never
    // count against the collection limit. Conversion to "user" is one-way; convertedFromSystemAt
    // marks it.
    source: collectionSourceEnum("source").notNull().default(CollectionSource.USER),
    convertedFromSystemAt: timestamp("converted_from_system_at", { withTimezone: true }),
    // Hides the whole collection (and cascades isVaulted onto every memory
    // in it — see vault.service.ts) from every normal read path until the
    // vault PIN is unlocked.
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

// -----------------------------------------------------------------------------
// 13. Memories Table
// -----------------------------------------------------------------------------
export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: memoryTypeEnum("type").notNull(),
    // Always exists once POST /memories returns — this describes enrichment
    // progress, never whether the memory itself succeeded or failed to save.
    status: memoryStatusEnum("status").notNull().default(MemoryStatus.PROCESSING),
    title: text("title").notNull().default("Untitled"),
    url: text("url"),
    // Lowercased host, tracking params/fragment/trailing-slash stripped —
    // for non-blocking duplicate detection (see normalize-url.ts). Null for
    // non-link memories.
    normalizedUrl: text("normalized_url"),
    content: text("content"),
    description: text("description"),
    source: varchar("source", { length: 100 }),
    faviconUrl: text("favicon_url"),
    previewImageUrl: text("preview_image_url"),
    keywords: text("keywords").array(),
    // URL capture & preview system (docs/URL_CAPTURE_AND_PREVIEW.md) — all
    // null until ingestion runs, or forever null for non-link memories.
    previewStatus: text("preview_status"),
    previewSource: text("preview_source"),
    platform: text("platform"),
    resourceType: text("resource_type"),
    canonicalUrl: text("canonical_url"),
    // Diagnostics only — never shown to the user directly, see UI_COPY in
    // the plan ("Preview unavailable", not "Cloudflare blocked our crawler").
    fetchStatus: text("fetch_status"),
    captureMethod: text("capture_method"),
    // Duplicate detection: null until checked, then "none", "pending" (found, awaiting the user) or
    // "kept". duplicateOfId has no foreign key: it's a hint that may outlive the original.
    duplicateStatus: varchar("duplicate_status", { length: 16 }),
    duplicateOfId: uuid("duplicate_of_id"),
    // Raw browser-observed metadata from the Chrome extension's
    // POST /:id/browser-capture, consumed by the ingestion pipeline's merge
    // step and kept for re-merging on a later /refresh-preview.
    browserCapture: jsonb("browser_capture"),
    // A social post or video as read from its platform (ai/url-processor/
    // social): author, text, media, counts, a YouTube video's chapters and
    // transcript. Null for any other link, and until ingestion runs.
    socialPost: jsonb("social_post"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    inTrash: boolean("in_trash").notNull().default(false),
    // When this became true. Null while inTrash is false (never trashed, or
    // restored). Drives the 15-day safety window before the purge job hard-
    // deletes it — see modules/memory/trash-purge.job.ts.
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    // The Inbox (read later). Null = unread: links, videos, documents and
    // pictures start unread; notes and voice memos (written by the user) start
    // read. Opening it, or "Mark as read", sets it; a due reminder clears it.
    readAt: timestamp("read_at", { withTimezone: true }),
    // "Remind me": when it should come back. Until then it's snoozed (hidden
    // from the Inbox); at that time the reminder job makes it unread again,
    // notifies, records remindedAt and clears this.
    remindAt: timestamp("remind_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    // Hidden from every normal read until the vault PIN is unlocked. Also set when the memory is in
    // a vaulted collection, so reads don't need to join collection_memories.
    isVaulted: boolean("is_vaulted").notNull().default(false),
    // User-set date for something this memory is about; null means none. Powers "Add to calendar"
    // (a Google link or .ics, no OAuth).
    eventAt: timestamp("event_at", { withTimezone: true }),
    // How long that event runs, in minutes. Null means the 1-hour default —
    // set by the calendar when an event is created, moved or resized there.
    eventDurationMinutes: integer("event_duration_minutes"),
    // AI-guessed date from DetectEvent, never user-set. It becomes eventAt only when the user
    // confirms, through updateMemory.
    suggestedEventAt: timestamp("suggested_event_at", { withTimezone: true }),
    // 0.0-1.0 confidence from DetectEvent. Only values over EVENT_DETECTION_CONFIDENCE_THRESHOLD
    // trigger notifications; lower guesses are stored silently.
    eventDetectionConfidence: real("event_detection_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    // AI ingestion (docs/AI_REQUIREMENTS.md) — populated async by the
    // ingestion pipeline after create, all nullable until that job runs.
    documentEmbedding: vector("document_embedding", EMBEDDING_DIMENSIONS),
    // Populated by a DB trigger from title/description/inferred_intent/content
    // (see the ingestion migration) — the app never writes this column.
    ftsTokens: tsvector("fts_tokens"),
    resourceCategory: text("resource_category"),
    inferredIntent: text("inferred_intent"),
    intentConfidence: real("intent_confidence"),
    // Open-vocabulary content type ("recipe", "task", ...) plus the structured fields
    // DetectContentType pulled out for it.
    contentType: text("content_type"),
    extractedFields: jsonb("extracted_fields"),
    // What the web research step found for this memory (shown under "What Savedly understood");
    // null when it didn't search.
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
    // The purge job's whole query is "trashed items older than the cutoff" —
    // partial so it stays tiny (almost every memory has in_trash = false).
    index("idx_memories_trashed_at").on(table.trashedAt).where(sql`${table.inTrash} = true`),
  ]
);

// -----------------------------------------------------------------------------
// 14. Collection <-> Memory Junction Table
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 15. Tags Table (scoped per-user — a tag name is only unique within its owner)
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 16. Memory <-> Tag Junction Table
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 17. Attachments Table (files uploaded to R2 and linked to a memory)
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 18. Memory Chunks Table (semantic chunks for RAG retrieval, AI ingestion)
// -----------------------------------------------------------------------------
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
