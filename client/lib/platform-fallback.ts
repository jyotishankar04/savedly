// Platform-branded fallback tiles for link previews that couldn't be fetched
// (docs/URL_CAPTURE_AND_PREVIEW.md — previewSource: "platform_fallback").
// Brand-colored gradients + the platform name as text only — no logos or
// scraped artwork, since we don't have rights to redistribute those.
// Independent of server/src/modules/ai/url-processor/platform-detector.ts's
// platform list (no shared package between client/server in this repo), but
// intentionally kept in sync with it.
export interface PlatformFallback {
  label: string;
  gradientClassName: string;
}

const PLATFORM_FALLBACKS: Record<string, PlatformFallback> = {
  instagram: { label: "Instagram", gradientClassName: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  x: { label: "X", gradientClassName: "bg-gradient-to-br from-neutral-800 to-black" },
  youtube: { label: "YouTube", gradientClassName: "bg-gradient-to-br from-red-600 to-red-800" },
  tiktok: { label: "TikTok", gradientClassName: "bg-gradient-to-br from-black via-neutral-800 to-teal-500" },
  linkedin: { label: "LinkedIn", gradientClassName: "bg-gradient-to-br from-sky-600 to-blue-800" },
  threads: { label: "Threads", gradientClassName: "bg-gradient-to-br from-neutral-900 to-neutral-700" },
  facebook: { label: "Facebook", gradientClassName: "bg-gradient-to-br from-blue-500 to-blue-700" },
  reddit: { label: "Reddit", gradientClassName: "bg-gradient-to-br from-orange-500 to-orange-700" },
  github: { label: "GitHub", gradientClassName: "bg-gradient-to-br from-neutral-700 to-neutral-900" },
  medium: { label: "Medium", gradientClassName: "bg-gradient-to-br from-neutral-800 to-black" },
  dribbble: { label: "Dribbble", gradientClassName: "bg-gradient-to-br from-pink-400 to-rose-600" },
  behance: { label: "Behance", gradientClassName: "bg-gradient-to-br from-blue-600 to-indigo-700" },
  producthunt: { label: "Product Hunt", gradientClassName: "bg-gradient-to-br from-orange-500 to-red-500" },
  leetcode: { label: "LeetCode", gradientClassName: "bg-gradient-to-br from-amber-500 to-neutral-900" },
};

const GENERIC_FALLBACK: PlatformFallback = {
  label: "Link",
  gradientClassName: "bg-gradient-to-br from-slate-500 to-slate-700",
};

/** Never returns null — an unrecognized platform (or none) gets a neutral generic tile, per "never render a blank preview." */
export function getPlatformFallback(platform: string | null): PlatformFallback {
  if (!platform) return GENERIC_FALLBACK;
  return PLATFORM_FALLBACKS[platform.toLowerCase()] ?? GENERIC_FALLBACK;
}
