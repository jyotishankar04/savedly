import { detectPlatform, extractServerMetadata, fetchUrl, buildPreview, defaultFaviconUrl, postAsText, resolveShortLink, socialExtractorFor, type SocialPost } from "../../url-processor";
import { extractPdfContent } from "./lib/parse-pdf";
import { analyzeImage } from "./lib/analyze-image";
import { transcriptInEnglish } from "./lib/translate-transcript";
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

// A post with this little text is mostly its picture, so the picture is described and search finds
// it by what's in it.
const SHORT_POST_CHARS = 280;

async function fromSocialPost(
  state: IngestionStateType,
  readPost: SocialPost,
  { platform, resourceType, domain }: { platform: string | null; resourceType: string | null; domain: string },
): Promise<IngestionUpdate> {
  let post = readPost;
  const first = post.media?.[0];
  const postImage = first ? (first.thumbnailUrl ?? (first.type === "image" ? first.url : null)) : null;
  // A cover the person picked in the extension stays theirs.
  const imageUrl = state.browserCapture?.imageUrl ?? postImage;

  // Always English: a transcript without an English track is translated.
  if (post.transcript) post = { ...post, transcript: await transcriptInEnglish(post.transcript, { userId: state.userId, requestType: "ingestion:transcript_translate", memoryId: state.memoryId }) };

  let rawContent = postAsText(post);
  if (postImage && !post.transcript && (post.text?.length ?? 0) < SHORT_POST_CHARS) {
    const seen = await analyzeImage(postImage, { userId: state.userId, requestType: "ingestion:vision", memoryId: state.memoryId });
    if (seen) rawContent += `\n\nImage: ${seen}`;
  }

  const who = post.author?.handle ? `@${post.author.handle}` : post.author?.name;
  const opening = post.text?.replace(/\s+/g, " ").trim();
  const title = post.title ?? (opening ? `${who ? `${who}: ` : ""}${opening.length > 90 ? `${opening.slice(0, 87)}…` : opening}` : null);

  logNode(state.memoryId, "parseWebContent", {
    url: state.url,
    kind: "social",
    platform,
    source: post.source,
    textLength: post.text?.length ?? 0,
    transcriptLines: post.transcript?.segments.length ?? 0,
    contentLength: rawContent.length,
  });

  return {
    rawContent: rawContent.slice(0, 80_000),
    platform,
    resourceType,
    fetchStatus: "success",
    canonicalUrl: post.url,
    previewImageUrl: imageUrl,
    faviconUrl: defaultFaviconUrl(state.url ?? post.url),
    previewStatus: imageUrl ? "available" : "partial",
    previewSource: state.browserCapture?.imageUrl ? "browser" : "server",
    sourceDomain: domain || null,
    previewTitle: title,
    previewDescription: opening ? opening.slice(0, 500) : null,
    socialPost: post,
  };
}

type PageContext = { platform: string | null; resourceType: string | null; domain: string };
type FetchResult = Awaited<ReturnType<typeof fetchUrl>>;

/** A link that is a PDF: its text, with no thumbnail to show. */
async function fromPdf(state: IngestionStateType, pageUrl: string, fetchResult: FetchResult, binaryData: Buffer, { platform, resourceType, domain }: PageContext): Promise<IngestionUpdate> {
  const rawContent = await extractPdfContent(
    binaryData,
    { userId: state.userId, requestType: "ingestion:pdf_summary", memoryId: state.memoryId },
    state.caption || undefined,
  );
  logNode(state.memoryId, "parseWebContent", { url: pageUrl, fetchStatus: fetchResult.status, kind: "pdf", contentLength: rawContent.length });
  return {
    rawContent,
    platform,
    resourceType,
    fetchStatus: fetchResult.status,
    canonicalUrl: fetchResult.finalUrl ?? pageUrl,
    // No natural thumbnail, so stay "partial" rather than claim an "available" preview.
    previewImageUrl: null,
    faviconUrl: defaultFaviconUrl(pageUrl),
    previewStatus: "partial",
    previewSource: "server",
    sourceDomain: domain || null,
    previewTitle: null,
    previewDescription: null,
  };
}

/** A link that is a bare image: described by the vision model, and its own thumbnail. */
async function fromImage(state: IngestionStateType, pageUrl: string, fetchResult: FetchResult, { platform, resourceType, domain }: PageContext): Promise<IngestionUpdate> {
  const imageUrl = fetchResult.finalUrl ?? pageUrl;
  const rawContent = await analyzeImage(imageUrl, { userId: state.userId, requestType: "ingestion:vision", memoryId: state.memoryId });
  logNode(state.memoryId, "parseWebContent", {
    url: pageUrl,
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
    // The URL is the image: a perfect thumbnail, which makes previewStatus "available" (the memory
    // then becomes "ready").
    previewImageUrl: imageUrl,
    faviconUrl: defaultFaviconUrl(pageUrl),
    previewStatus: "available",
    previewSource: "server",
    sourceDomain: domain || null,
    previewTitle: null,
    previewDescription: null,
  };
}

/** An ordinary web page: its text and the preview built from its tags (and from what the extension sent). */
function fromPage(
  state: IngestionStateType,
  pageUrl: string,
  fetchResult: FetchResult,
  { platform, resourceType, domain, hasAuth }: PageContext & { hasAuth: boolean },
  readerWasTried: boolean,
): IngestionUpdate {
  // `html` is non-empty for "success" and "javascript_required": a JS-shell page still ships a real
  // <head>, so don't gate on success. With no HTML, the origin's /favicon.ico is a fair guess.
  const serverMetadata = fetchResult.html
    ? extractServerMetadata(fetchResult.html, fetchResult.finalUrl ?? pageUrl)
    : { title: null, description: null, imageUrl: null, canonicalUrl: null, faviconUrl: defaultFaviconUrl(pageUrl) };

  const preview = buildPreview(serverMetadata, state.browserCapture, { platform, resourceType, domain, hasAuth });
  // A post or video whose reader came back empty (removed, private) has only the platform's app
  // shell as text: keep just its preview tags.
  const rawContent = fetchResult.html && !readerWasTried ? stripHtml(fetchResult.html).slice(0, MAX_CONTENT_LENGTH) : "";

  logNode(state.memoryId, "parseWebContent", {
    url: pageUrl,
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

/**
 * The core of URL capture and preview (docs/URL_CAPTURE_AND_PREVIEW.md): safe fetch, platform
 * detection, metadata, merge with the extension's, and a preview that's never blank. A failed fetch
 * never fails the memory.
 */
export async function parseWebContent(state: IngestionStateType): Promise<IngestionUpdate> {
  if (!state.url) {
    logNode(state.memoryId, "parseWebContent", { skipped: "no url" });
    return { rawContent: "" };
  }

  // A short link (lnkd.in, t.co, redd.it, ...) is read as the page it leads to.
  const pageUrl = await resolveShortLink(state.url);
  const detected = detectPlatform(pageUrl);
  const { platform, resourceType, domain } = detected;

  // A social post or video is read from its platform; if that fails, fall through to the page fetch.
  const read = socialExtractorFor(pageUrl);
  const post = read ? await read(pageUrl).catch(() => null) : null;
  if (post) return fromSocialPost(state, post, { platform, resourceType, domain });

  const fetchResult = await fetchUrl(pageUrl);

  // A pasted URL is always "web" client-side, so a public PDF or image link is only caught here, on
  // a genuine 200.
  if (fetchResult.status === "success" && fetchResult.contentType?.includes("application/pdf") && fetchResult.binaryData) {
    return fromPdf(state, pageUrl, fetchResult, fetchResult.binaryData, { platform, resourceType, domain });
  }
  if (fetchResult.status === "success" && fetchResult.contentType?.includes("image/")) {
    return fromImage(state, pageUrl, fetchResult, { platform, resourceType, domain });
  }

  return fromPage(state, pageUrl, fetchResult, detected, !!read);
}
