import type { MemoryType } from "@/types/memory";

/**
 * Literal hex rather than theme tokens: these are painted onto a `<canvas>`
 * (the memory graph), which can't resolve CSS custom properties or Tailwind
 * classes. Chosen to stay legible on both the light and dark canvas
 * backgrounds, and to match the colours already used ad hoc for these types
 * elsewhere (e.g. video reads red in memory-thumbnail.tsx).
 */
export const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  web: "#1447e6", // primary blue
  video: "#ef4444",
  note: "#f59e0b",
  image: "#8b5cf6",
  document: "#10b981",
  voice: "#ec4899",
};
