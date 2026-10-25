const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "tiktok.com", "twitch.tv"];
const URL_PATTERN = /https?:\/\/\S+/i;

/**
 * Regex backstop for the client's link detection (client/lib/detect-memory-type.ts): the first URL
 * in a text.
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
 * The link a note really is: a URL with at most a short comment. Null for a note that merely
 * contains a link, which stays a note.
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
