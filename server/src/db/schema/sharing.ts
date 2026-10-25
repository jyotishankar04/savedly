import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ShareAccessRequestStatus, ShareGrantSource, ShareGrantStatus, ShareLinkAccess } from "../enums";
import { users } from "./identity";
import { collections, memories } from "./library";
import { shareAccessRequestStatusEnum, shareGrantSourceEnum, shareGrantStatusEnum, shareLinkAccessEnum, shareResourceTypeEnum } from "./pg-enums";

// One row per shared resource. Two independent axes: shares.linkAccess (what the link does) and
// shareGrants (who is invited), so a link can be public while people are also invited.
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // A discriminator plus exactly one populated FK: real FKs give ON DELETE CASCADE, so a deleted
    // collection never leaves a live slug.
    resourceType: shareResourceTypeEnum("resource_type").notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "cascade" }),

    slug: varchar("slug", { length: 32 }).notNull().unique(),
    linkAccess: shareLinkAccessEnum("link_access").notNull().default(ShareLinkAccess.DISABLED),

    // scrypt (share.password.ts). passwordUpdatedAt is in every unlock token, so changing or
    // clearing the password invalidates issued cookies.
    passwordHash: text("password_hash"),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),

    // Off by default; only honoured for public links.
    allowSearchIndexing: boolean("allow_search_indexing").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "ck_shares_one_resource",
      sql`(${table.resourceType} = 'collection' AND ${table.collectionId} IS NOT NULL AND ${table.memoryId} IS NULL)
       OR (${table.resourceType} = 'memory' AND ${table.memoryId} IS NOT NULL AND ${table.collectionId} IS NULL)`
    ),
    check(
      "ck_shares_password_present",
      sql`${table.linkAccess} <> 'password' OR ${table.passwordHash} IS NOT NULL`
    ),
    // One share per resource — this is what makes get-or-create idempotent.
    uniqueIndex("uq_shares_collection").on(table.collectionId).where(sql`${table.collectionId} IS NOT NULL`),
    uniqueIndex("uq_shares_memory").on(table.memoryId).where(sql`${table.memoryId} IS NOT NULL`),
    index("idx_shares_owner").on(table.ownerId),
    // Serves the public_share_count plan-limit tally.
    index("idx_shares_owner_link_access").on(table.ownerId, table.linkAccess),
  ]
);

export const shareGrants = pgTable(
  "share_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),

    // Null until someone signs up with the address: the email is the key, since an owner can invite
    // someone without an account.
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // Always stored lowercased; users.email is plain varchar, not citext.
    inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),

    status: shareGrantStatusEnum("status").notNull().default(ShareGrantStatus.PENDING),
    source: shareGrantSourceEnum("source").notNull().default(ShareGrantSource.DIRECT_INVITE),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_share_grants_share_email").on(table.shareId, table.inviteeEmail),
    index("idx_share_grants_user_status").on(table.userId, table.status),
    // Drives the claim at signup. Revoked rows are kept so a revoked invite can't reactivate.
    index("idx_share_grants_pending_email").on(table.inviteeEmail).where(sql`${table.userId} IS NULL`),
  ]
);

export const shareAccessRequests = pgTable(
  "share_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Requesting needs an account: it gives the owner an identity to approve and makes anonymous
    // spam impossible.
    requesterUserId: uuid("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    message: varchar("message", { length: 500 }),
    status: shareAccessRequestStatusEnum("status").notNull().default(ShareAccessRequestStatus.PENDING),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // One *open* request per person per share; decided rows stay as history.
    uniqueIndex("uq_share_access_requests_open")
      .on(table.shareId, table.requesterUserId)
      .where(sql`${table.status} = 'pending'`),
    index("idx_share_access_requests_share_status").on(table.shareId, table.status),
    index("idx_share_access_requests_requester").on(table.requesterUserId),
  ]
);

// One row per de-duplicated view, not per request: recordShareView inserts only if the viewer has
// no row in the dedup window.
export const shareViews = pgTable(
  "share_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Null for anonymous. Set null on delete so view history survives the viewer's account.
    viewerUserId: uuid("viewer_user_id").references(() => users.id, { onDelete: "set null" }),
    // Anonymous dedup only, never a raw IP; salted per share so it can't correlate a visitor across shares.
    viewerIpHash: varchar("viewer_ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_share_views_share_created").on(table.shareId, table.createdAt),
    // The dedup check's access path.
    index("idx_share_views_share_viewer").on(table.shareId, table.viewerUserId),
    index("idx_share_views_share_ip").on(table.shareId, table.viewerIpHash),
  ]
);
