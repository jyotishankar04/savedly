import { fetchJson } from "./http";
import type { SocialPost } from "./types";

// A TikTok video, from TikTok's oEmbed: its caption, author and thumbnail.
// What's said in it is only in the audio, which isn't read.

export async function extractTikTok(url: string): Promise<SocialPost | null> {
  if (!/\/video\/\d+/.test(url)) return null;
  const data = await fetchJson<{ title?: string; author_name?: string; author_unique_id?: string; author_url?: string; thumbnail_url?: string }>(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  );
  if (!data || (!data.title && !data.thumbnail_url)) return null;
  return {
    platform: "tiktok",
    kind: "video",
    url,
    author: { name: data.author_name, handle: data.author_unique_id, url: data.author_url },
    text: data.title?.trim() || undefined,
    media: data.thumbnail_url ? [{ type: "video", url, thumbnailUrl: data.thumbnail_url }] : undefined,
    source: "oembed",
  };
}
