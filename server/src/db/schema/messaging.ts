import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { ContactMessageStatus, EmailStatus, ReportStatus } from "../enums";
import { users } from "./identity";
import { contactMessageStatusEnum, emailCategoryEnum, emailStatusEnum, emailTemplateKeyEnum, reportStatusEnum, reportTypeEnum } from "./pg-enums";

// -----------------------------------------------------------------------------
// 27. (Removed: Transactions, Coupons, Coupon Redemptions, Referral Codes,
//     Referral Conversions, Credit Ledger, User Credit Balances — this
//     product has no billing, so there's nothing for any of them to
//     record. plans/planLimits/userPlanAssignments above stayed: they're
//     what grants everyone the single unlimited free plan, not a
//     paid-tier mechanism.)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// 34. Email Campaigns Table (one row per admin bulk-compose action — the
//     subject/body were composed once and fanned out to N recipients, each
//     tracked as its own email_messages row below. Every automatic/system
//     email (welcome, ban notice, share events) has no campaign at all.)
// -----------------------------------------------------------------------------
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: emailCategoryEnum("category").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    bodyText: text("body_text").notNull(),
    // Recorded so the history view can show "sent to all users" vs. a named
    // list without re-deriving it from the individual message rows.
    recipientFilter: jsonb("recipient_filter").$type<{ all: true } | { userIds: string[] }>().notNull(),
    recipientCount: integer("recipient_count").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_email_campaigns_created").on(table.createdAt)]
);

// -----------------------------------------------------------------------------
// 35. Email Messages Table (one row per individual send attempt — system-
//     triggered or part of a campaign — this is what the BullMQ email
//     worker loads by id and updates as it sends. The single source of
//     truth for delivery status; Mailhog/SMTP holds no state of its own.)
// -----------------------------------------------------------------------------
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for every system/automatic send — only the admin bulk composer
    // groups messages under a campaign.
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
    // Null when the recipient has no account yet (e.g. a share invite sent
    // to an email address that hasn't signed up) — recipientEmail is the
    // one field every row is guaranteed to have.
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    category: emailCategoryEnum("category").notNull(),
    templateKey: emailTemplateKeyEnum("template_key").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    // The rendered HTML actually handed to nodemailer — kept for delivery
    // debugging/audit even though Mailhog also stores its own copy.
    bodyHtml: text("body_html").notNull(),
    status: emailStatusEnum("status").notNull().default(EmailStatus.QUEUED),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_email_messages_campaign").on(table.campaignId),
    index("idx_email_messages_recipient_user").on(table.recipientUserId),
    index("idx_email_messages_status_created").on(table.status, table.createdAt),
  ]
);

// Messages from the website's contact page (/contact). Saved before the team
// is emailed, so none is lost when email is off or fails; read and answered
// in Admin > Messages. userId is set when the person was signed in.
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    topic: varchar("topic", { length: 40 }).notNull(),
    message: text("message").notNull(),
    status: contactMessageStatusEnum("status").notNull().default(ContactMessageStatus.NEW),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // When the copy to the team's inbox went out; null when email is off or failed.
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_contact_messages_status_created").on(table.status, table.createdAt)]
);

// Replies sent from Admin > Messages to someone who wrote in: a contact
// message or a report ("kind" says which, "targetId" which one). Kept so the
// conversation shows in the reading pane; the email itself goes to them.
export const messageReplies = pgTable(
  "message_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_message_replies_target").on(table.kind, table.targetId, table.createdAt)]
);

// -----------------------------------------------------------------------------
// 38. Reports Table (bug reports and feature requests submitted from the
//     public /report page — no auth required, but userId is captured when
//     the submitter happens to be signed in. No admin UI reads this yet;
//     it's reviewable directly via drizzle-kit studio until one exists.)
// -----------------------------------------------------------------------------
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: reportTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    // Optional even when signed in — someone reporting a bug on behalf of a
    // teammate, or just preferring not to be tied to their account email.
    email: varchar("email", { length: 255 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: reportStatusEnum("status").notNull().default(ReportStatus.OPEN),
    // Where they were when they hit "report a bug" — real diagnostic value
    // (which page, which app route) that a free-text description often omits.
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_reports_type").on(table.type),
    index("idx_reports_status").on(table.status),
    index("idx_reports_created_at").on(table.createdAt),
  ]
);
