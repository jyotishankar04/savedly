import { detectPlatform, extractServerMetadata, fetchUrl, buildPreview, defaultFaviconUrl } from "../../url-processor";
import { extractPdfContent } from "./lib/parse-pdf";
import { analyzeImage } from "./lib/analyze-image";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

const MAX_CONTENT_LENGTH = 20000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The core of the URL capture & preview system (docs/URL_CAPTURE_AND_PREVIEW.md):
 * SSRF-safe fetch -> platform detection -> metadata extraction -> merge with
 * whatever the Chrome extension already submitted -> a preview that's never
 * blank, whether or not the fetch itself succeeded. A failed fetch here
 * never fails the memory — it only ever changes what UpsertVectors records
 * as previewStatus/previewSource, never whether the memory exists.
 */
export async function parseWebContent(state: IngestionStateType): Promise<IngestionUpdate> {
  if (!state.url) {
    logNode(state.memoryId, "parseWebContent", { skipped: "no url" });
    return { rawContent: "" };
  }

  const { platform, resourceType, domain, hasAuth } = detectPlatform(state.url);
  const fetchResult = await fetchUrl(state.url);

  // A pasted URL is always mediaType "web" client-side (content-type isn't
  // knowable before the fetch), so a public PDF or raw image link only ever
  // reaches RouteMediaType as "web" — this is the one place that can catch
  // it and extract something real instead of leaving it as a blank page.
  // Both branches only fire on a genuine 200; any error/blocked/timeout
  // status falls straight through to the existing HTML-oriented logic below,
  // unchanged.
  if (fetchResult.status === "success" && fetchResult.contentType?.includes("application/pdf") && fetchResult.binaryData) {
    const rawContent = await extractPdfContent(
      fetchResult.binaryData,
      { userId: state.userId, requestType: "ingestion:pdf_summary", memoryId: state.memoryId },
      state.caption || undefined,
    );
    logNode(state.memoryId, "parseWebContent", { url: state.url, fetchStatus: fetchResult.status, kind: "pdf", contentLength: rawContent.length });
    return {
      rawContent,
      platform,
      resourceType,
      fetchStatus: fetchResult.status,
      canonicalUrl: fetchResult.finalUrl ?? state.url,
      // A PDF has no natural thumbnail image, so this stays "partial" —
      // same as any other link with no OG image today — rather than
      // claiming an "available" preview that doesn't exist.
      previewImageUrl: null,
      faviconUrl: defaultFaviconUrl(state.url),
      previewStatus: "partial",
      previewSource: "server",
      sourceDomain: domain || null,
      previewTitle: null,
      previewDescription: null,
    };
  }

  if (fetchResult.status === "success" && fetchResult.contentType?.includes("image/")) {
    const imageUrl = fetchResult.finalUrl ?? state.url;
    const rawContent = await analyzeImage(imageUrl, { userId: state.userId, requestType: "ingestion:vision", memoryId: state.memoryId });
    logNode(state.memoryId, "parseWebContent", {
      url: state.url,
      fetchStatus: fetchResult.status,
      kind: "image",
      contentLength: rawContent.length,
    });
    return {
      rawContent,
      platform,
      resourceType,
      fetchStatus: fetchResult.status,
      canonicalUrl: imageUrl,
      // The URL literally *is* the image — a perfect thumbnail, and this is
      // what upgrades previewStatus to "available" (upsertVectors then
      // promotes the memory to "ready" instead of "partial").
      previewImageUrl: imageUrl,
      faviconUrl: defaultFaviconUrl(state.url),
      previewStatus: "available",
      previewSource: "server",
      sourceDomain: domain || null,
      previewTitle: null,
      previewDescription: null,
    };
  }

  // `html` is only ever non-empty for "success" or "javascript_required" (see
  // server-fetcher.ts) — a JS-shell SPA page (e.g. a LeetCode profile) still
  // ships a server-rendered <head> with a real <title>, og:* tags, and a
  // favicon <link>, even though its <body> needs a browser to render. Gating
  // this on status === "success" threw all of that away and left every
  // preview field — including the favicon — null for any client-rendered page.
  //
  // Even when there's no HTML at all (blocked, timeout, robots-disallowed,
  // ...) the origin's `/favicon.ico` is still a reasonable guess — every
  // browser falls back to the same thing — so that field alone doesn't need
  // real HTML to have a value.
  const serverMetadata = fetchResult.html
    ? extractServerMetadata(fetchResult.html, fetchResult.finalUrl ?? state.url)
    : { title: null, description: null, imageUrl: null, canonicalUrl: null, faviconUrl: defaultFaviconUrl(state.url) };

  const preview = buildPreview(serverMetadata, state.browserCapture, { platform, resourceType, domain, hasAuth });
  const rawContent = fetchResult.html ? stripHtml(fetchResult.html).slice(0, MAX_CONTENT_LENGTH) : "";

  logNode(state.memoryId, "parseWebContent", {
    url: state.url,
    fetchStatus: fetchResult.status,
    httpStatus: fetchResult.httpStatus,
    platform,
    resourceType,
    previewStatus: preview.previewStatus,
    previewSource: preview.previewSource,
    contentLength: rawContent.length,
  });

  return {
    rawContent,
    platform,
    resourceType,
    fetchStatus: fetchResult.status,
    canonicalUrl: preview.canonicalUrl,
    previewImageUrl: preview.imageUrl,
    faviconUrl: preview.faviconUrl,
    previewStatus: preview.previewStatus,
    previewSource: preview.previewSource,
    sourceDomain: domain || null,
    previewTitle: preview.title,
    previewDescription: preview.description,
  };
}
