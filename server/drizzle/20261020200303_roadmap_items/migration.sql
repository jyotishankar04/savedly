CREATE TYPE "roadmap_status" AS ENUM('now', 'next');--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(60) NOT NULL UNIQUE,
	"status" "roadmap_status" DEFAULT 'next'::"roadmap_status" NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"area" varchar(40),
	"points" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_roadmap_items_status_order" ON "roadmap_items" ("status","sort_order");--> statement-breakpoint
--> statement-breakpoint
-- The roadmap as it stood when it moved from the website's code to Admin > Roadmap.
INSERT INTO "roadmap_items" ("slug", "status", "title", "description", "area", "points", "sort_order") VALUES
  ('phone-gestures', 'now', 'Gestures on your phone', 'Faster on a phone: swipe a memory to archive it or mark it read, and rename one by tapping its title.', 'App', '["Swipe left or right on any list", "Rename in place, no dialog", "Undo on every swipe"]'::jsonb, 0),
  ('firefox-extension', 'next', 'Savedly for Firefox', 'The browser extension for Firefox: save, highlight and search without leaving the page.', 'Extension', '["Save pages, links, images and screenshots, as in Chrome", "Highlights and Savedly in Firefox''s sidebar", "Signs in with your Savedly account; nothing to set up"]'::jsonb, 0),
  ('pdf-highlights', 'next', 'Highlights in PDFs', 'Highlight passages in PDFs you open in the browser, not just web pages.', 'Extension', '["Highlight and add notes in PDFs open in your browser", "Your highlights come back when you open the PDF again", "Find a PDF later by what you highlighted in it"]'::jsonb, 1),
  ('weekly-email', 'next', 'A weekly email of things to read', 'A short email once a week bringing back a few unread saves from your Inbox, so they get read instead of buried.', 'Inbox', '["A few unread saves from your Inbox, once a week", "Mark as read or snooze straight from the email", "Off whenever you like, in Settings"]'::jsonb, 2),
  ('import-highlights', 'next', 'Import from Kindle and Readwise', 'Bring the highlights you''ve made elsewhere into Savedly, next to everything else.', 'Highlights', '["Kindle highlights from your device''s clippings file", "Readwise highlights from its export", "Searchable, and part of what Ask answers from"]'::jsonb, 3),
  ('more-integrations', 'next', 'Notion and more integrations', 'Connect Notion, and save from the places you already read: Reddit, YouTube, X, Instagram and LinkedIn.', 'Integrations', '["Notion pages saved, and kept in step when they change", "Your saved posts from Reddit, X, Instagram and LinkedIn", "YouTube videos you''ve liked or saved to watch later"]'::jsonb, 4),
  ('audio', 'next', 'Audio, fully supported', 'Save voice notes, podcasts and audio files, transcribed so you can search and ask about what was said.', 'Saving', '["Record a voice note or upload an audio file", "Save a podcast episode from its link", "A transcript you can search and ask about"]'::jsonb, 5)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "roadmap_votes" ADD CONSTRAINT "roadmap_votes_item_slug_roadmap_items_slug_fkey" FOREIGN KEY ("item_slug") REFERENCES "roadmap_items"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
