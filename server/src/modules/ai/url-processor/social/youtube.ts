import { fetchJson } from "./http";
import type { SocialPost } from "./types";

// A YouTube video: details from the player API and captions as a transcript. Asked as the iOS app,
// because the web player's caption links need a proof-of-origin token and come back empty (checked
// Oct 2026). Falls back to oEmbed.

const IOS_CLIENT = { clientName: "IOS", clientVersion: "20.10.4", deviceModel: "iPhone16,2", hl: "en" };
const IOS_UA = "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X;)";
// A long talk's captions run to hundreds of thousands of characters; this is plenty to search and summarize.
const MAX_TRANSCRIPT_CHARS = 60_000;

export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const match = /^\/(?:shorts|live|embed|v)\/([A-Za-z0-9_-]{6,})/.exec(u.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

interface PlayerResponse {
  playabilityStatus?: { status?: string };
  videoDetails?: {
    title?: string;
    author?: string;
    channelId?: string;
    shortDescription?: string;
    lengthSeconds?: string;
    viewCount?: string;
    thumbnail?: { thumbnails?: { url: string; width?: number }[] };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: { baseUrl: string; languageCode: string; kind?: string }[];
      translationLanguages?: { languageCode: string }[];
    };
  };
}

/** "0:00 Intro" lines in a description, when there are at least two starting at 0:00. */
function chaptersFrom(description: string): { start: number; title: string }[] | undefined {
  const chapters = description
    .split("\n")
    .map((line) => /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—:|]?\s*(.+?)\s*$/.exec(line))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ start: Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]), title: m[4]! }));
  return chapters.length >= 2 && chapters[0]!.start === 0 ? chapters : undefined;
}

type CaptionData = { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] };
const isEnglish = (code: string) => code.split("-")[0] === "en";

/**
 * The transcript, in English when possible. Dubbed videos list an automatic track per dub, so: a
 * written English track, else the automatic English one, else YouTube's English translation of the
 * best track, else the track as is.
 */
async function transcriptFrom(player: PlayerResponse): Promise<SocialPost["transcript"]> {
  const list = player.captions?.playerCaptionsTracklistRenderer;
  const tracks = list?.captionTracks ?? [];
  if (!tracks.length) return undefined;
  const english = tracks.find((t) => isEnglish(t.languageCode) && t.kind !== "asr") ?? tracks.find((t) => isEnglish(t.languageCode));
  // The original language: a written track first (people write those), else the automatic one.
  const original = tracks.find((t) => t.kind !== "asr") ?? tracks[0]!;
  let track = english ?? original;
  let translatedFrom: string | undefined;
  let data = await fetchJson<CaptionData>(`${track.baseUrl}&fmt=json3`, { userAgent: IOS_UA });
  if (!english && list?.translationLanguages?.some((l) => l.languageCode === "en")) {
    const translated = await fetchJson<CaptionData>(`${track.baseUrl}&fmt=json3&tlang=en`, { userAgent: IOS_UA });
    if (translated?.events?.length) {
      data = translated;
      translatedFrom = track.languageCode;
    }
  }
  if (!data?.events) return undefined;
  const segments: { start: number; text: string }[] = [];
  let total = 0;
  for (const event of data.events) {
    const text = (event.segs ?? []).map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    segments.push({ start: Math.round((event.tStartMs ?? 0) / 1000), text });
    total += text.length + 1;
    if (total > MAX_TRANSCRIPT_CHARS) break;
  }
  return segments.length ? { language: translatedFrom ? "en" : track.languageCode, auto: track.kind === "asr" || !!translatedFrom, translatedFrom, segments } : undefined;
}

export async function extractYouTube(url: string): Promise<SocialPost | null> {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const kind: SocialPost["kind"] = /\/shorts\//.test(url) ? "short" : "video";
  const watchUrl = kind === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;

  const player = await fetchJson<PlayerResponse>("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    userAgent: IOS_UA,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: { client: IOS_CLIENT }, videoId: id }),
  });
  const details = player?.playabilityStatus?.status === "OK" ? player.videoDetails : undefined;

  if (details?.title) {
    const thumbs = details.thumbnail?.thumbnails ?? [];
    const thumbnail = [...thumbs].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const description = details.shortDescription?.trim() || undefined;
    return {
      platform: "youtube",
      kind,
      url: watchUrl,
      author: { name: details.author, url: details.channelId ? `https://www.youtube.com/channel/${details.channelId}` : undefined },
      title: details.title,
      text: description,
      media: [{ type: "video", url: watchUrl, thumbnailUrl: thumbnail }],
      stats: { views: details.viewCount ? Number(details.viewCount) : undefined },
      durationSeconds: details.lengthSeconds ? Number(details.lengthSeconds) : undefined,
      chapters: description ? chaptersFrom(description) : undefined,
      transcript: await transcriptFrom(player!),
      embed: { provider: "youtube", id, aspect: kind === "short" ? 9 / 16 : 16 / 9 },
      source: "api",
    };
  }

  const oembed = await fetchJson<{ title?: string; author_name?: string; author_url?: string; thumbnail_url?: string }>(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
  );
  if (!oembed?.title) return null;
  return {
    platform: "youtube",
    kind,
    url: watchUrl,
    author: { name: oembed.author_name, url: oembed.author_url },
    title: oembed.title,
    media: oembed.thumbnail_url ? [{ type: "video", url: watchUrl, thumbnailUrl: oembed.thumbnail_url }] : undefined,
    embed: { provider: "youtube", id, aspect: kind === "short" ? 9 / 16 : 16 / 9 },
    source: "oembed",
  };
}
