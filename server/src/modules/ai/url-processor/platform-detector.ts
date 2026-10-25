import type { PlatformInfo } from "./types";
import { extractReddit, extractTikTok, extractX, extractYouTube, unfurl, type SocialExtractor } from "./social";

/**
 * Credential lookup for a platform that needs authenticated fetching. `envVar` names the secret,
 * resolved lazily so a platform without it just has no credential.
 */
interface PlatformAuthConfig {
  type: "cookie" | "bearer_token" | "api_key";
  envVar: string;
}

interface PlatformRule {
  platform: string;
  hostnames: string[];
  resourceType?: (pathname: string) => string | null;
  auth?: PlatformAuthConfig;
  /** Reads a post or video's content (social/), for these resource types only; null when it can't. */
  extract?: { resourceTypes: string[]; read: SocialExtractor };
}

// Data, not branching: a new platform is a new row, never an `if (host...)` elsewhere. For
// authenticated fetching add `auth: { type, envVar }` to its row.
// resourceType is a per-platform classifier over the path (a GitHub URL can be a repo, issue, PR or
// profile) and returns null rather than guessing.
const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: "instagram",
    hostnames: ["instagram.com"],
    resourceType: (path) => {
      if (/^\/(p|reel|reels|tv)\//.test(path)) return "post";
      if (/^\/stories\//.test(path)) return "story";
      if (/^\/[^/]+\/?$/.test(path)) return "profile";
      return null;
    },
    extract: { resourceTypes: ["post"], read: unfurl("instagram") },
  },
  {
    platform: "x",
    hostnames: ["x.com", "twitter.com"],
    resourceType: (path) => {
      if (/\/status\/\d+/.test(path)) return "post";
      if (/^\/[^/]+\/?$/.test(path)) return "profile";
      return null;
    },
    extract: { resourceTypes: ["post"], read: extractX },
  },
  {
    platform: "youtube",
    hostnames: ["youtube.com", "youtu.be"],
    resourceType: (path) => {
      if (/^\/shorts\//.test(path)) return "short";
      if (/^\/watch/.test(path) || /^\/[A-Za-z0-9_-]{6,}$/.test(path)) return "video";
      if (/^\/(channel|c)\//.test(path) || /^\/@/.test(path)) return "channel";
      if (/^\/playlist/.test(path)) return "playlist";
      return null;
    },
    extract: { resourceTypes: ["video", "short"], read: extractYouTube },
  },
  {
    platform: "tiktok",
    hostnames: ["tiktok.com"],
    resourceType: (path) => {
      if (/\/video\/\d+/.test(path)) return "video";
      if (/^\/@[^/]+\/?$/.test(path)) return "profile";
      return null;
    },
    extract: { resourceTypes: ["video"], read: extractTikTok },
  },
  {
    platform: "threads",
    hostnames: ["threads.net", "threads.com"],
    resourceType: (path) => {
      if (/^\/@[^/]+\/post\//.test(path)) return "post";
      if (/^\/@[^/]+\/?$/.test(path)) return "profile";
      return null;
    },
    extract: { resourceTypes: ["post"], read: unfurl("threads") },
  },
  {
    platform: "linkedin",
    hostnames: ["linkedin.com"],
    resourceType: (path) => {
      if (/^\/(posts|pulse)\//.test(path) || /^\/feed\/update\//.test(path)) return "post";
      if (/^\/in\//.test(path)) return "profile";
      if (/^\/company\//.test(path)) return "company";
      return null;
    },
    extract: { resourceTypes: ["post"], read: unfurl("linkedin") },
  },
  {
    platform: "facebook",
    hostnames: ["facebook.com", "fb.com", "fb.watch"],
    resourceType: (path) => (/\/(posts|videos|reel|permalink|watch|share)\b/.test(path) ? "post" : null),
    extract: { resourceTypes: ["post"], read: unfurl("facebook") },
  },
  {
    platform: "reddit",
    hostnames: ["reddit.com"],
    resourceType: (path) => {
      if (/\/comments\//.test(path)) return "post";
      if (/^\/r\/[^/]+\/?$/.test(path)) return "subreddit";
      return null;
    },
    extract: { resourceTypes: ["post"], read: extractReddit },
  },
  {
    platform: "github",
    hostnames: ["github.com"],
    resourceType: (path) => {
      const segments = path.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[2] === "issues") return "issue";
      if (segments.length >= 4 && segments[2] === "pull") return "pull_request";
      if (segments.length === 2) return "repository";
      if (segments.length === 1) return "profile";
      return null;
    },
  },
  { platform: "medium", hostnames: ["medium.com"], resourceType: () => "article" },
  {
    platform: "dribbble",
    hostnames: ["dribbble.com"],
    resourceType: (path) => (/^\/shots\//.test(path) ? "shot" : null),
  },
  {
    platform: "behance",
    hostnames: ["behance.net"],
    resourceType: (path) => (/^\/gallery\//.test(path) ? "project" : null),
  },
  {
    platform: "producthunt",
    hostnames: ["producthunt.com"],
    resourceType: (path) => (/^\/posts\//.test(path) ? "product" : null),
  },
  {
    platform: "leetcode",
    hostnames: ["leetcode.com"],
    resourceType: (path) => {
      if (/^\/problems\//.test(path)) return "problem";
      if (/^\/u\//.test(path) || /^\/[^/]+\/?$/.test(path)) return "profile";
      if (/^\/discuss\//.test(path)) return "discussion";
      if (/^\/contest\//.test(path)) return "contest";
      return null;
    },
  },
];

export const KNOWN_PLATFORMS = PLATFORM_RULES.map((r) => r.platform);

export function detectPlatform(url: string): PlatformInfo {
  let hostname: string;
  let pathname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return { platform: null, resourceType: null, domain: "", hasAuth: false };
  }

  const rule = PLATFORM_RULES.find((r) => r.hostnames.some((h) => hostname === h || hostname.endsWith(`.${h}`)));
  if (!rule) return { platform: null, resourceType: null, domain: hostname, hasAuth: false };

  return {
    platform: rule.platform,
    resourceType: rule.resourceType?.(pathname) ?? null,
    domain: hostname,
    hasAuth: !!rule.auth && !!process.env[rule.auth.envVar],
  };
}

/**
 * The reader for a URL's post or video, when its platform has one for that kind of page (see
 * `extract` above).
 */
export function socialExtractorFor(url: string): SocialExtractor | null {
  const { platform, resourceType } = detectPlatform(url);
  const rule = PLATFORM_RULES.find((r) => r.platform === platform);
  return rule?.extract && resourceType && rule.extract.resourceTypes.includes(resourceType) ? rule.extract.read : null;
}

/**
 * The configured credential for a platform, if any; where an authenticated fetcher should read
 * secrets. Reads process.env directly because these are per-platform, optional and pluggable.
 */
export function getPlatformCredential(platform: string): { type: PlatformAuthConfig["type"]; value: string } | null {
  const rule = PLATFORM_RULES.find((r) => r.platform === platform);
  if (!rule?.auth) return null;
  const value = process.env[rule.auth.envVar];
  return value ? { type: rule.auth.type, value } : null;
}
