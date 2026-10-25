/**
 * A social post or video read from its platform, stored on the memory and used as the pipeline's
 * text. Only platform and address are always present.
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
   * A video's `src` is a file a browser plays itself (X, LinkedIn); otherwise it plays via `embed`
   * or opens on the platform. `aspect` is width / height.
   */
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string; src?: string; aspect?: number }[];
  stats?: { likes?: number; comments?: number; views?: number; reposts?: number };
  /** A post this one quotes (an X quote post). */
  quoted?: { author?: string; text: string };
  durationSeconds?: number;
  chapters?: { start: number; title: string }[];
  /** Always English when it can be: `translatedFrom` is the spoken language when YouTube translated it. */
  transcript?: { language: string; auto: boolean; translatedFrom?: string; segments: { start: number; text: string }[] };
  /**
   * The platform's own player: YouTube by id (transcript and chapters seek it); TikTok, Instagram
   * and Facebook by their embed address.
   */
  embed?: { provider: "youtube" | "tiktok" | "instagram" | "facebook"; id?: string; src?: string; aspect?: number };
  /** How it was read: the platform's API, its oEmbed, or the page's preview tags. */
  source: "api" | "oembed" | "page";
}

export type SocialExtractor = (url: string) => Promise<SocialPost | null>;
