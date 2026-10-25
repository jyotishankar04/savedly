import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { ContactMessageStatus, EmailStatus, ReportStatus } from "../enums";
import { users } from "./identity";
import { contactMessageStatusEnum, emailCategoryEnum, emailStatusEnum, emailTemplateKeyEnum, reportStatusEnum, reportTypeEnum } from "./pg-enums";

// One row per admin bulk email, fanned out to N email_messages rows. Automatic emails have no campaign.
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: emailCategoryEnum("category").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    bodyText: text("body_text").notNull(),
    // Kept so history can show "sent to all users" vs a named list.
    recipientFilter: jsonb("recipient_filter").$type<{ all: true } | { userIds: string[] }>().notNull(),
    recipientCount: integer("recipient_count").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_email_campaigns_created").on(table.createdAt)]
);

// One row per send attempt: the source of truth for delivery status, updated by the email worker.
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for system sends; only the admin bulk composer uses campaigns.
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
    // Null when the recipient has no account yet; recipientEmail is always set.
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    category: emailCategoryEnum("category").notNull(),
    templateKey: emailTemplateKeyEnum("template_key").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    // The HTML actually handed to nodemailer, kept for debugging and audit.
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

// Contact-page messages, saved before the team is emailed so none is lost; answered in Admin >
// Messages. userId set when signed in.
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

// Replies from Admin > Messages to a contact message or report ("kind" and "targetId" say which),
// kept for the reading pane.
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

// Bug reports and feature requests from /report (userId set when signed in); no admin UI yet.
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: reportTypeEnum("type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    // Optional even when signed in.
    email: varchar("email", { length: 255 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: reportStatusEnum("status").notNull().default(ReportStatus.OPEN),
    // The page they reported from: diagnostic detail a description often omits.
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
