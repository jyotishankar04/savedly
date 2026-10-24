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
  /**
   * Pictures and videos. A video's `src` is a file a browser plays itself (X,
   * LinkedIn); without one it's played through `embed`, or opened on the platform.
   * `aspect` is width / height.
   */
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string; src?: string; aspect?: number }[];
  stats?: { likes?: number; comments?: number; views?: number; reposts?: number };
  /** A post this one quotes (an X quote post). */
  quoted?: { author?: string; text: string };
  durationSeconds?: number;
  chapters?: { start: number; title: string }[];
  transcript?: { language: string; auto: boolean; segments: { start: number; text: string }[] };
  /**
   * The platform's own player, for the memory's page: YouTube by id (its
   * transcript and chapters seek it); TikTok, Instagram and Facebook by the
   * embed address they publish for this. `aspect` is width / height.
   */
  embed?: { provider: "youtube" | "tiktok" | "instagram" | "facebook"; id?: string; src?: string; aspect?: number };
  /** How it was read: the platform's API, its oEmbed, or the page's preview tags. */
  source: "api" | "oembed" | "page";
}

export type SocialExtractor = (url: string) => Promise<SocialPost | null>;
