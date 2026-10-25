import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ShareAccessRequestStatus, ShareGrantSource, ShareGrantStatus, ShareLinkAccess } from "../enums";
import { users } from "./identity";
import { collections, memories } from "./library";
import { shareAccessRequestStatusEnum, shareGrantSourceEnum, shareGrantStatusEnum, shareLinkAccessEnum, shareResourceTypeEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 14b. Sharing — one row per shared resource, plus grants and access requests
//
// The four sharing "modes" are two orthogonal axes, not one setting:
//   * shares.linkAccess  — what the *link* does (off / public / ask / password)
//   * shareGrants        — which specific people have access, regardless of the link
// So a link can be public while named people are also invited, and a grantee
// still gets in when the link is switched off. Collapsing these into a single
// enum would make those combinations unexpressible.
// -----------------------------------------------------------------------------
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // A discriminator plus exactly one populated FK, rather than a single
    // polymorphic resource_id. Real FKs buy ON DELETE CASCADE, and both
    // delete paths here are hard deletes — without it, deleting a collection
    // would leave a live slug pointing at nothing.
    resourceType: shareResourceTypeEnum("resource_type").notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }),
    memoryId: uuid("memory_id").references(() => memories.id, { onDelete: "cascade" }),

    slug: varchar("slug", { length: 32 }).notNull().unique(),
    linkAccess: shareLinkAccessEnum("link_access").notNull().default(ShareLinkAccess.DISABLED),

    // scrypt, see modules/share/share.password.ts. passwordUpdatedAt is
    // stamped into every unlock token, so changing or clearing the password
    // invalidates the cookies already handed out without tracking them.
    passwordHash: text("password_hash"),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }),

    // Off by default: people paste these links around without expecting
    // search engines to pick them up. Only ever honoured for public links.
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

    // Null until somebody signs up with this address — the email, not the
    // user, is the natural key here, because an owner can invite a person
    // who has no account yet.
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
    // Drives the claim at signup. Revoked rows are kept rather than deleted
    // precisely so a revoked invite can't quietly reactivate later.
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
    // Requesting access requires an account: it gives the owner a real
    // identity to approve, lets approval create a grant directly, and makes
    // anonymous spam impossible.
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

// -----------------------------------------------------------------------------
// 14b-2. Share views — one row per de-duplicated view, not per HTTP request
//
// A page load is not a view: a signed-in visitor refreshing, a router
// retry, or (concretely) React StrictMode's dev-mode double-effect all
// produce more than one request per human visit. share.service.ts's
// recordShareView only inserts a row (and bumps shares.viewCount) when no
// row already exists for the same viewer within the dedup window, so the
// counter reflects visits, not requests.
// -----------------------------------------------------------------------------
export const shareViews = pgTable(
  "share_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    // Null for an anonymous visitor. Kept on delete (set null, not cascade)
    // so a share's view history — and its counts — survive the viewer's
    // account being deleted later.
    viewerUserId: uuid("viewer_user_id").references(() => users.id, { onDelete: "set null" }),
    // Only for anonymous dedup/uniqueness — never a raw IP. Salted per-share
    // (see share.service.ts) so the same hash can't correlate one visitor
    // across two different shares.
    viewerIpHash: varchar("viewer_ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_share_views_share_created").on(table.shareId, table.createdAt),
    // The dedup check's own access path: "has this viewer already got a
    // row for this share recently".
    index("idx_share_views_share_viewer").on(table.shareId, table.viewerUserId),
    index("idx_share_views_share_ip").on(table.shareId, table.viewerIpHash),
  ]
);
