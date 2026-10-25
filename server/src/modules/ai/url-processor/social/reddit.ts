import { SAVEDLY_UA, decodeEntities } from "./http";
import type { SocialPost } from "./types";

// A Reddit post from its RSS feed (the page sends bots nothing and the JSON API wants a login):
// title, author, text or shared link, and top comments. One request for the saved post.

const TOP_COMMENTS = 5;

const tag = (entry: string, name: string) => new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(entry)?.[1];
/** An entry's HTML content as text, without Reddit's "submitted by … [link] [comments]" footer. */
function textOf(html: string | undefined): string {
  if (!html) return "";
  return decodeEntities(decodeEntities(html).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, " "))
    .replace(/submitted by\s+\/u\/[\w-]+\s*\[link\]\s*\[comments\]/i, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function extractReddit(url: string): Promise<SocialPost | null> {
  // Also the subreddit-less form a redd.it short link leads to: reddit.com/comments/<id>.
  const match = /^(https:\/\/(?:www\.|old\.)?reddit\.com\/(?:r\/[\w]+\/)?comments\/[a-z0-9]+(?:\/[^/?#]*)?)/i.exec(url);
  if (!match) return null;
  const postUrl = match[1]!.replace(/^https:\/\/(?:www\.|old\.)?reddit\.com/i, "https://www.reddit.com").replace(/\/?$/, "/");
  let feed: string;
  try {
    const response = await fetch(`${postUrl}.rss`, { headers: { "User-Agent": SAVEDLY_UA }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    feed = await response.text();
  } catch {
    return null;
  }
  const [post, ...comments] = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]!);
  if (!post) return null;

  const handle = /<author><name>\/?u\/([\w-]+)<\/name>/.exec(post)?.[1];
  const content = tag(post, "content");
  // A link post's content points at what it shares.
  const shared = content ? /href="(https?:\/\/[^"]+)"[^>]*>\s*\[link\]/.exec(decodeEntities(content))?.[1] : undefined;
  const sharedLink = shared && !/reddit\.com|redd\.it/.test(shared) ? decodeEntities(shared) : undefined;
  const body = textOf(content);
  const thumbnail = /<media:thumbnail url="([^"]+)"/.exec(post)?.[1];
  const top = comments
    .slice(0, TOP_COMMENTS)
    .map((entry) => ({ by: /<author><name>\/?u\/([\w-]+)<\/name>/.exec(entry)?.[1], text: textOf(tag(entry, "content")).slice(0, 400) }))
    .filter((c) => c.text);

  const text = [body, sharedLink && `Link: ${sharedLink}`, top.length ? `Top comments:\n${top.map((c) => `${c.by ? `u/${c.by}: ` : ""}${c.text}`).join("\n\n")}` : null]
    .filter(Boolean)
    .join("\n\n");
  const published = tag(post, "published");
  return {
    platform: "reddit",
    kind: "post",
    url: postUrl,
    author: handle ? { name: `u/${handle}`, handle, url: `https://www.reddit.com/user/${handle}/` } : undefined,
    title: decodeEntities(tag(post, "title") ?? "").trim() || undefined,
    text: text || undefined,
    publishedAt: published ? new Date(published).toISOString() : undefined,
    media: thumbnail ? [{ type: "image", url: decodeEntities(thumbnail) }] : undefined,
    stats: { comments: comments.length || undefined },
    source: "page",
  };
}
