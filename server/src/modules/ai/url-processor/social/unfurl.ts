import { fetchUrl } from "../server-fetcher";
import { decodeEntities, parseCount } from "./http";
import type { SocialPost } from "./types";

// Instagram, Threads, LinkedIn, Reddit, Facebook: the post the user saved,
// read the way a link preview is (WhatsApp, Slack, iMessage): one request for
// that page, and only its public preview tags. Their robots.txt turns away
// every bot, which is about crawling; this is one page, the one the person
// chose to save, and nothing beyond it (see docs/URL_CAPTURE_AND_PREVIEW.md).

/** A page's <meta> tags by property or name, decoded. Reads the quotes properly, so an apostrophe in a caption doesn't cut it short. */
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

type Fields = Pick<SocialPost, "author" | "text" | "title" | "publishedAt" | "stats">;

// How each platform writes a post into its preview tags (checked Oct 2026).
const PARSERS: Record<string, (tags: Map<string, string>) => Fields> = {
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
  // og:title: the post's opening | Name | N comments; og:description: the post.
  linkedin: (tags) => {
    const parts = (tags.get("og:title") ?? "").split(" | ").map((p) => p.trim());
    const name = parts.length >= 2 && !/comments?$/i.test(parts[1]!) ? parts[1] : undefined;
    return { author: name ? { name } : undefined, text: tags.get("og:description") ?? parts[0], publishedAt: tags.get("article:published_time") };
  },
  // og:title: r/sub - The title; og:description: the post's text.
  reddit: (tags) => {
    const m = /^(r\/[\w]+)\s+-\s+(.+)$/.exec(tags.get("og:title") ?? "");
    return { author: m ? { name: m[1] } : undefined, title: m?.[2] ?? tags.get("og:title"), text: tags.get("og:description") };
  },
  facebook: (tags) => ({ title: tags.get("og:title"), text: tags.get("og:description") }),
};

export function unfurl(platform: keyof typeof PARSERS) {
  return async (url: string): Promise<SocialPost | null> => {
    const page = await fetchUrl(url, { robots: "skip" });
    if (!page.html) return null;
    const tags = metaTags(page.html);
    const fields = PARSERS[platform]!(tags);
    const image = tags.get("og:image") ?? tags.get("twitter:image");
    if (!fields.text && !fields.title && !image) return null;
    const video = /\/(reel|reels|tv)\//.test(url) || tags.get("og:type")?.includes("video");
    return {
      platform,
      kind: platform === "instagram" && /\/(reel|reels)\//.test(url) ? "reel" : video ? "video" : "post",
      url: tags.get("og:url") ?? page.finalUrl ?? url,
      ...fields,
      media: image ? [video ? { type: "video", url, thumbnailUrl: image } : { type: "image", url: image }] : undefined,
      source: "page",
    };
  };
}
