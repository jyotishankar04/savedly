import { fetchUrl } from "../server-fetcher";
import { decodeEntities, parseCount } from "./http";
import type { SocialPost } from "./types";

// Instagram, Threads, LinkedIn, Facebook: read like a link preview (one request, public preview
// tags only). Their robots.txt is about crawling; this is the one page the person chose
// (docs/URL_CAPTURE_AND_PREVIEW.md).

/**
 * A page's <meta> tags, decoded; parses quotes properly so an apostrophe in a caption doesn't cut
 * it short.
 */
function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name: string) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
    const key = attr("property") ?? attr("name");
    const content = attr("content");
    if (!key || !content) continue;
    const name = (key[1] ?? key[2] ?? "").toLowerCase();
    if (name && !tags.has(name)) tags.set(name, decodeEntities(content[1] ?? content[2] ?? "").trim());
  }
  return tags;
}

type Fields = Pick<SocialPost, "author" | "text" | "title" | "publishedAt" | "stats" | "transcript"> & { image?: string; video?: boolean; videoSrc?: string; aspect?: number };

type LinkedData = Record<string, unknown>;
/** The page's JSON-LD blocks (schema.org), flattened out of any @graph. */
function linkedData(html: string): LinkedData[] {
  const out: LinkedData[] = [];
  for (const [, block] of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block!) as LinkedData | LinkedData[];
      for (const item of Array.isArray(data) ? data : [data]) out.push(...(Array.isArray(item["@graph"]) ? (item["@graph"] as LinkedData[]) : [item]));
    } catch {
    }
  }
  return out;
}
const str = (value: unknown) => (typeof value === "string" && value.trim() ? decodeEntities(value).trim() : undefined);
const imageOf = (value: unknown): string | undefined => (typeof value === "string" ? value : Array.isArray(value) ? imageOf(value[0]) : value && typeof value === "object" ? str((value as LinkedData).url) : undefined);
/** schema.org interaction counts: likes (LikeAction) and comments (CommentAction). */
function interactions(item: LinkedData): SocialPost["stats"] {
  const stats: NonNullable<SocialPost["stats"]> = {};
  const list = Array.isArray(item.interactionStatistic) ? (item.interactionStatistic as LinkedData[]) : [];
  for (const s of list) {
    const kind = JSON.stringify(s.interactionType ?? "");
    const n = Number(s.userInteractionCount);
    if (!Number.isFinite(n)) continue;
    if (/Like/i.test(kind)) stats.likes = n;
    else if (/Comment/i.test(kind)) stats.comments = n;
  }
  if (typeof item.commentCount === "number") stats.comments ??= item.commentCount;
  return Object.keys(stats).length ? stats : undefined;
}

// LinkedIn's generic share picture, not the post's own.
const GENERIC_IMAGE = /static\.licdn\.com\/aero/;

// How each platform writes a post into its preview tags (checked Oct 2026).
const PARSERS: Record<string, (tags: Map<string, string>, html: string) => Fields> = {
  // og:description: 60M likes, 4M comments - world_record_egg on January 4, 2019: "Let’s set a world record…"
  instagram: (tags) => {
    const description = tags.get("og:description") ?? tags.get("description") ?? "";
    const m = /^(?:([\d.,]+[KMB]?) likes?,\s*)?(?:([\d.,]+[KMB]?) comments?\s*)?-\s*([\w.]+) on ([^:]+?):\s*["“]([\s\S]*?)["”]\.?\s*$/i.exec(description);
    if (!m) return { text: description || undefined };
    const date = new Date(`${m[4]} UTC`);
    return {
      author: { handle: m[3], url: `https://www.instagram.com/${m[3]}/` },
      text: m[5]!.trim(),
      publishedAt: Number.isNaN(date.getTime()) ? undefined : date.toISOString(),
      stats: { likes: parseCount(m[1]), comments: parseCount(m[2]) },
    };
  },
  // og:title: Zuck (@zuck) on Threads; og:description: the post.
  threads: (tags) => {
    const m = /^(.*?)\s*\(@([\w.]+)\)/.exec(tags.get("og:title") ?? "");
    return { author: m ? { name: m[1] || undefined, handle: m[2], url: `https://www.threads.net/@${m[2]}` } : undefined, text: tags.get("og:description") };
  },
  // The page's JSON-LD (SocialMediaPosting, or VideoObject) has the whole post; the preview tags
  // are the fallback.
  linkedin: (tags, html) => {
    const item = linkedData(html).find((d) => /SocialMediaPosting|VideoObject|Article|DiscussionForumPosting/.test(String(d["@type"])));
    const fallback = (tags.get("og:description") ?? "").replace(/\s*\|\s*\d[\d,.]*\s+comments? on LinkedIn\s*$/i, "").trim();
    if (!item) return { text: fallback || undefined, publishedAt: tags.get("article:published_time") };
    const who = (item.author ?? item.creator) as LinkedData | LinkedData[] | undefined;
    const person = Array.isArray(who) ? who[0] : who;
    const transcript = str(item.transcript);
    const isVideo = /VideoObject/.test(String(item["@type"]));
    return {
      author: person ? { name: str(person.name), url: str(person.url), avatarUrl: imageOf(person.image) } : undefined,
      text: str(item.articleBody) ?? str(item.description) ?? str(item.text) ?? (fallback || undefined),
      publishedAt: str(item.datePublished) ?? str(item.uploadDate),
      stats: interactions(item),
      transcript: transcript ? { language: "en", auto: false, segments: [{ start: 0, text: transcript }] } : undefined,
      image: imageOf(item.thumbnailUrl) ?? imageOf(item.image),
      video: isVideo,
      // The video file itself (an MP4), which a browser plays without LinkedIn's player.
      videoSrc: isVideo ? str(item.contentUrl) : undefined,
      aspect: Number(item.width) && Number(item.height) ? Number(item.width) / Number(item.height) : undefined,
    };
  },
  facebook: (tags) => ({ title: tags.get("og:title"), text: tags.get("og:description") }),
};

/** The platform's published embed player for a video post: Instagram's /embed/, Facebook's video plugin. */
function embedFor(platform: string, url: string): SocialPost["embed"] {
  if (platform === "instagram") {
    const m = /\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url);
    return m ? { provider: "instagram", src: `https://www.instagram.com/${m[1] === "p" ? "p" : "reel"}/${m[2]}/embed/`, aspect: 9 / 16 } : undefined;
  }
  if (platform === "facebook") return { provider: "facebook", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, aspect: 16 / 9 };
  return undefined;
}

export function unfurl(platform: keyof typeof PARSERS) {
  return async (url: string): Promise<SocialPost | null> => {
    const page = await fetchUrl(url, { robots: "skip" });
    if (!page.html) return null;
    const tags = metaTags(page.html);
    const { image: ownImage, video: isVideo, videoSrc, aspect, ...fields } = PARSERS[platform]!(tags, page.html);
    const tagImage = tags.get("og:image") ?? tags.get("twitter:image");
    const image = ownImage ?? (tagImage && !GENERIC_IMAGE.test(tagImage) ? tagImage : undefined);
    if (!fields.text && !fields.title && !image) return null;
    const video = isVideo || /\/(reel|reels|tv)\//.test(url) || tags.get("og:type")?.includes("video");
    const kind = platform === "instagram" && /\/(reel|reels)\//.test(url) ? "reel" : video ? "video" : "post";
    return {
      platform,
      kind,
      url: tags.get("og:url") ?? page.finalUrl ?? url,
      ...fields,
      media: image || videoSrc ? [video ? { type: "video", url, thumbnailUrl: image, src: videoSrc, aspect } : { type: "image", url: image! }] : undefined,
      embed: video && !videoSrc ? embedFor(platform, url) : undefined,
      source: "page",
    };
  };
}
