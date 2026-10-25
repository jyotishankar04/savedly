import type { PreviewFields } from "./types";

function resolveUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

/** First matching meta tag's content, checking property/content in either attribute order. */
function extractMetaContent(html: string, properties: string[]): string | null {
  for (const prop of properties) {
    const propFirst = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"),
    );
    if (propFirst) return propFirst[1] || null;

    const contentFirst = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"),
    );
    if (contentFirst) return contentFirst[1] || null;
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function extractCanonical(html: string, pageUrl: string): string | null {
  const match =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return match ? resolveUrl(match[1], pageUrl) : null;
}

/**
 * The origin's `/favicon.ico` guess; needs only a valid URL. Websites only (chrome:// pages have no
 * loadable icon).
 */
export function defaultFaviconUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return new URL("/favicon.ico", url).href;
  } catch {
    return null;
  }
}

function extractFavicon(html: string, pageUrl: string): string | null {
  const match =
    html.match(/<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i);
  return (match ? resolveUrl(match[1], pageUrl) : null) ?? defaultFaviconUrl(pageUrl);
}

/**
 * What the HTML offers, reduced by og:* > twitter:* > plain tags; the caller applies browser
 * capture on top.
 */
export function extractServerMetadata(html: string, pageUrl: string): PreviewFields {
  const rawImage = extractMetaContent(html, ["og:image", "og:image:url", "twitter:image"]);

  return {
    title: extractMetaContent(html, ["og:title", "twitter:title"]) ?? extractTitleTag(html),
    description: extractMetaContent(html, ["og:description", "twitter:description", "description"]),
    imageUrl: rawImage ? resolveUrl(rawImage, pageUrl) : null,
    canonicalUrl: extractMetaContent(html, ["og:url"]) ?? extractCanonical(html, pageUrl),
    faviconUrl: extractFavicon(html, pageUrl),
  };
}
