CREATE TYPE "notification_type" AS ENUM('share_invite_received', 'share_access_requested', 'share_access_approved', 'share_access_denied', 'share_revoked');--> statement-breakpoint
CREATE TYPE "share_access_request_status" AS ENUM('pending', 'approved', 'denied', 'cancelled');--> statement-breakpoint
CREATE TYPE "share_grant_source" AS ENUM('direct_invite', 'access_request');--> statement-breakpoint
CREATE TYPE "share_grant_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "share_link_access" AS ENUM('disabled', 'public', 'request', 'password');--> statement-breakpoint
CREATE TYPE "share_resource_type" AS ENUM('collection', 'memory');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"action_url" varchar(500),
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"share_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"message" varchar(500),
	"status" "share_access_request_status" DEFAULT 'pending'::"share_access_request_status" NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"share_id" uuid NOT NULL,
	"user_id" uuid,
	"invitee_email" varchar(255) NOT NULL,
	"status" "share_grant_status" DEFAULT 'pending'::"share_grant_status" NOT NULL,
	"source" "share_grant_source" DEFAULT 'direct_invite'::"share_grant_source" NOT NULL,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"resource_type" "share_resource_type" NOT NULL,
	"collection_id" uuid,
	"memory_id" uuid,
	"slug" varchar(32) NOT NULL UNIQUE,
	"link_access" "share_link_access" DEFAULT 'disabled'::"share_link_access" NOT NULL,
	"password_hash" text,
	"password_updated_at" timestamp with time zone,
	"allow_search_indexing" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_shares_one_resource" CHECK (("resource_type" = 'collection' AND "collection_id" IS NOT NULL AND "memory_id" IS NULL)
       OR ("resource_type" = 'memory' AND "memory_id" IS NOT NULL AND "collection_id" IS NULL)),
	CONSTRAINT "ck_shares_password_present" CHECK ("link_access" <> 'password' OR "password_hash" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_share_access_requests_open" ON "share_access_requests" ("share_id","requester_user_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_share_access_requests_share_status" ON "share_access_requests" ("share_id","status");--> statement-breakpoint
CREATE INDEX "idx_share_access_requests_requester" ON "share_access_requests" ("requester_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_share_grants_share_email" ON "share_grants" ("share_id","invitee_email");--> statement-breakpoint
CREATE INDEX "idx_share_grants_user_status" ON "share_grants" ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_share_grants_pending_email" ON "share_grants" ("invitee_email") WHERE "user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shares_collection" ON "shares" ("collection_id") WHERE "collection_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shares_memory" ON "shares" ("memory_id") WHERE "memory_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_shares_owner" ON "shares" ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_shares_owner_link_access" ON "shares" ("owner_id","link_access");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_access_requests" ADD CONSTRAINT "share_access_requests_share_id_shares_id_fkey" FOREIGN KEY ("share_id") REFERENCES "shares"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_access_requests" ADD CONSTRAINT "share_access_requests_requester_user_id_users_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_access_requests" ADD CONSTRAINT "share_access_requests_decided_by_users_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_share_id_shares_id_fkey" FOREIGN KEY ("share_id") REFERENCES "shares"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_collection_id_collections_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;