import type { SocialPost } from "./types";

export type { SocialPost, SocialExtractor } from "./types";
export { extractYouTube, youtubeVideoId } from "./youtube";
export { extractX } from "./x";
export { extractTikTok } from "./tiktok";
export { extractReddit } from "./reddit";
export { unfurl } from "./unfurl";

const clock = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`;
};

/** A post as one readable document for the pipeline, instead of a page's stripped HTML. */
export function postAsText(post: SocialPost): string {
  const who = post.author?.name && post.author?.handle ? `${post.author.name} (@${post.author.handle})` : post.author?.handle ? `@${post.author.handle}` : post.author?.name;
  const what = { post: "Post", video: "Video", short: "Short", reel: "Reel" }[post.kind];
  const when = post.publishedAt ? new Date(post.publishedAt).toDateString() : null;
  const lines = [[`${what} on ${post.platform}`, who && `by ${who}`, when && `, ${when}`].filter(Boolean).join(" ")];
  if (post.title) lines.push(`Title: ${post.title}`);
  if (post.text) lines.push(post.text);
  if (post.quoted) lines.push(`Quoting${post.quoted.author ? ` @${post.quoted.author}` : ""}: ${post.quoted.text}`);
  if (post.chapters?.length) lines.push(`Chapters:\n${post.chapters.map((c) => `${clock(c.start)} ${c.title}`).join("\n")}`);
  if (post.transcript?.segments.length) lines.push(`Transcript:\n${post.transcript.segments.map((s) => s.text).join(" ")}`);
  return lines.join("\n\n");
}
