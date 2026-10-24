import { decodeEntities, fetchJson } from "./http";
import type { SocialPost } from "./types";

// A post on X: from the endpoint X's own embedded posts read
// (cdn.syndication.twimg.com), with text, author, media, a quoted post and
// counts; or, failing that, from X's oEmbed (text and author only).

export function xPostId(url: string): string | null {
  return /\/status(?:es)?\/(\d+)/.exec(url)?.[1] ?? null;
}

/** The token X's embed script sends with a post id. */
function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

interface SyndicatedTweet {
  __typename?: string;
  text?: string;
  created_at?: string;
  favorite_count?: number;
  conversation_count?: number;
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string };
  entities?: { urls?: { url: string; expanded_url?: string }[]; media?: { url: string }[] };
  mediaDetails?: { type?: string; media_url_https?: string }[];
  video?: { poster?: string };
  quoted_tweet?: { text?: string; user?: { screen_name?: string } };
  note_tweet?: { text?: string };
}

/** t.co links as the addresses they stand for; the link to the post's own media dropped. */
function expandLinks(text: string, entities: SyndicatedTweet["entities"]): string {
  let out = text;
  for (const link of entities?.urls ?? []) out = out.split(link.url).join(link.expanded_url ?? link.url);
  for (const media of entities?.media ?? []) out = out.split(media.url).join("");
  return decodeEntities(out).trim();
}

export async function extractX(url: string): Promise<SocialPost | null> {
  const id = xPostId(url);
  if (!id) return null;

  const tweet = await fetchJson<SyndicatedTweet>(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${syndicationToken(id)}`);
  if (tweet?.__typename === "Tweet" && (tweet.text || tweet.note_tweet?.text)) {
    const handle = tweet.user?.screen_name;
    const media = (tweet.mediaDetails ?? [])
      .filter((m) => m.media_url_https)
      .map((m) => (m.type === "photo" ? { type: "image" as const, url: m.media_url_https! } : { type: "video" as const, url: `https://x.com/${handle}/status/${id}`, thumbnailUrl: m.media_url_https! }));
    return {
      platform: "x",
      kind: "post",
      url: `https://x.com/${handle ?? "i"}/status/${id}`,
      author: { name: tweet.user?.name, handle, url: handle ? `https://x.com/${handle}` : undefined, avatarUrl: tweet.user?.profile_image_url_https },
      text: expandLinks(tweet.note_tweet?.text ?? tweet.text ?? "", tweet.entities),
      publishedAt: tweet.created_at ? new Date(tweet.created_at).toISOString() : undefined,
      media: media.length ? media : undefined,
      stats: { likes: tweet.favorite_count, comments: tweet.conversation_count },
      quoted: tweet.quoted_tweet?.text ? { author: tweet.quoted_tweet.user?.screen_name, text: decodeEntities(tweet.quoted_tweet.text) } : undefined,
      source: "api",
    };
  }

  const oembed = await fetchJson<{ author_name?: string; author_url?: string; html?: string }>(
    `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(`https://x.com/i/status/${id}`)}`,
  );
  const paragraph = oembed?.html ? /<p[^>]*>([\s\S]*?)<\/p>/.exec(oembed.html)?.[1] : undefined;
  if (!paragraph) return null;
  const handle = oembed!.author_url?.split("/").pop();
  return {
    platform: "x",
    kind: "post",
    url: `https://x.com/${handle ?? "i"}/status/${id}`,
    author: { name: oembed!.author_name, handle, url: oembed!.author_url },
    text: decodeEntities(paragraph.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim(),
    source: "oembed",
  };
}
