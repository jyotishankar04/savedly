const TRACKING_PARAM_PATTERNS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^igshid$/i, /^mc_[a-z]+$/i, /^ref$/i, /^ref_src$/i];

/**
 * Lowercased host with tracking params, fragment and trailing slash stripped, for duplicate
 * detection (memories.normalized_url). Null for anything not a parseable http(s) URL; it never
 * throws, since detection must not fail a save.
 */
export function normalizeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";

  const keptParams = [...url.searchParams.entries()].filter(
    ([key]) => !TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(key)),
  );
  url.search = "";
  for (const [key, value] of keptParams.sort(([a], [b]) => a.localeCompare(b))) {
    url.searchParams.append(key, value);
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.hostname}${pathname}${url.search}`;
}
