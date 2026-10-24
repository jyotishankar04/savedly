const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "tiktok.com", "twitch.tv"];
const URL_PATTERN = /https?:\/\/\S+/i;

/**
 * Deterministic backstop for the client's own detectMemoryType/extractUrl
 * (client/lib/detect-memory-type.ts) — regex-based, not LLM-based, so it's
 * cheap and reliable for something that doesn't need judgment. Finds the
 * first URL anywhere in a block of text, mirroring the client's logic
 * exactly so a "note" that actually contains a link gets reclassified the
 * same way it would have been if the client had caught it.
 */
export function extractUrl(text: string): URL | null {
  const match = text.match(URL_PATTERN);
  if (!match) return null;
  const raw = match[0].replace(/[)\].,!?;:'"]+$/, "");
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * The link a note really is, for the server's backstop: a URL with at most a
 * short comment around it ("check this out https://… thoughts?"). Null for a
 * note that merely has a link in it: a link written as Markdown
 * ([label](https://…)), or one inside longer writing. A note written in the
 * editor must stay a note.
 */
export function linkOfNote(text: string): URL | null {
  const url = extractUrl(text);
  if (!url) return null;
  const raw = text.match(URL_PATTERN)![0];
  const at = text.indexOf(raw);
  if (text.slice(0, at).endsWith("](") || text.slice(0, at).endsWith("<")) return null;
  const rest = (text.slice(0, at) + text.slice(at + raw.length)).trim();
  if (rest.length > 280 || /\n\s*\n/.test(rest)) return null;
  return url;
}

export function isVideoUrl(url: URL): boolean {
  return VIDEO_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}
