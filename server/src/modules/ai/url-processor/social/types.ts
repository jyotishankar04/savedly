/**
 * What a social post or video is, read from the platform (social/*.ts):
 * stored on the memory (memories.social_post), shown on its page, and the
 * text the pipeline summarizes, tags and embeds. Every field is optional but
 * the platform and the address: platforms give different things.
 */
export interface SocialPost {
  platform: string;
  kind: "post" | "video" | "short" | "reel";
  url: string;
  author?: { name?: string; handle?: string; url?: string; avatarUrl?: string };
  title?: string;
  text?: string;
  publishedAt?: string;
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string }[];
  stats?: { likes?: number; comments?: number; views?: number; reposts?: number };
  /** A post this one quotes (an X quote post). */
  quoted?: { author?: string; text: string };
  durationSeconds?: number;
  chapters?: { start: number; title: string }[];
  transcript?: { language: string; auto: boolean; segments: { start: number; text: string }[] };
  /** What the memory's page can play inline. */
  embed?: { provider: "youtube"; id: string };
  /** How it was read: the platform's API, its oEmbed, or the page's preview tags. */
  source: "api" | "oembed" | "page";
}

export type SocialExtractor = (url: string) => Promise<SocialPost | null>;
