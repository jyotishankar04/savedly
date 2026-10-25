import type { BrowserCapturePayload, PlatformInfo, PreviewFields, PreviewSource, PreviewStatus } from "./types";

export interface BuiltPreview extends PreviewFields {
  previewStatus: PreviewStatus;
  previewSource: PreviewSource;
}

function firstNonEmpty(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

/**
 * One merge step: browser capture > server metadata (og:* > twitter:* > HTML) per field, then
 * platform artwork, then a generic domain card; a lower source never overwrites a higher.
 * `previewSource` tracks the image's origin; "user" is reserved.
 */
export function buildPreview(
  server: PreviewFields,
  browser: BrowserCapturePayload | null,
  platform: PlatformInfo,
): BuiltPreview {
  const merged: PreviewFields = {
    title: firstNonEmpty(browser?.title, server.title),
    description: firstNonEmpty(browser?.description, server.description),
    imageUrl: firstNonEmpty(browser?.imageUrl, server.imageUrl),
    canonicalUrl: firstNonEmpty(browser?.canonicalUrl, server.canonicalUrl),
    faviconUrl: firstNonEmpty(browser?.faviconUrl, server.faviconUrl),
  };

  if (merged.imageUrl) {
    const fromBrowser = !!browser?.imageUrl?.trim() && merged.imageUrl === browser.imageUrl.trim();
    return { ...merged, previewStatus: "available", previewSource: fromBrowser ? "browser" : "server" };
  }

  if (platform.platform) {
    return { ...merged, previewStatus: "partial", previewSource: "platform_fallback" };
  }

  const hasAnyMetadata = !!(merged.title || merged.description);
  return { ...merged, previewStatus: hasAnyMetadata ? "partial" : "unavailable", previewSource: "generic_fallback" };
}
