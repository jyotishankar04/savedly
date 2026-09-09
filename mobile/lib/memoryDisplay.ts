import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { MemoryType } from "@/lib/memories";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const MEMORY_TYPE_ICONS: Record<MemoryType, IoniconName> = {
  web: "globe-outline",
  video: "videocam-outline",
  note: "document-text-outline",
  image: "image-outline",
  document: "document-outline",
  voice: "mic-outline",
};

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  web: "Link",
  video: "Video",
  note: "Note",
  image: "Image",
  document: "Document",
  voice: "Voice",
};

export interface PlatformFallback {
  label: string;
  colors: [string, string];
}

// Same brand-color intent as client/lib/platform-fallback.ts (kept in sync
// by hand — no shared package between client/mobile in this repo) — solid
// gradients only, no logos, since we don't have rights to redistribute those.
const PLATFORM_FALLBACKS: Record<string, PlatformFallback> = {
  instagram: { label: "Instagram", colors: ["#8b5cf6", "#f97316"] },
  x: { label: "X", colors: ["#404040", "#000000"] },
  youtube: { label: "YouTube", colors: ["#dc2626", "#991b1b"] },
  tiktok: { label: "TikTok", colors: ["#171717", "#14b8a6"] },
  linkedin: { label: "LinkedIn", colors: ["#0284c7", "#1e40af"] },
  facebook: { label: "Facebook", colors: ["#3b82f6", "#1d4ed8"] },
  reddit: { label: "Reddit", colors: ["#f97316", "#c2410c"] },
  github: { label: "GitHub", colors: ["#404040", "#171717"] },
  medium: { label: "Medium", colors: ["#262626", "#000000"] },
  dribbble: { label: "Dribbble", colors: ["#f472b6", "#be123c"] },
  behance: { label: "Behance", colors: ["#2563eb", "#3730a3"] },
  producthunt: { label: "Product Hunt", colors: ["#f97316", "#dc2626"] },
  leetcode: { label: "LeetCode", colors: ["#f59e0b", "#171717"] },
};

const GENERIC_FALLBACK: PlatformFallback = { label: "Link", colors: ["#64748b", "#334155"] };

export function getPlatformFallback(platform: string | null): PlatformFallback {
  if (!platform) return GENERIC_FALLBACK;
  return PLATFORM_FALLBACKS[platform.toLowerCase()] ?? GENERIC_FALLBACK;
}
