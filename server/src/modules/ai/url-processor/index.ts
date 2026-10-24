export { detectPlatform, getPlatformCredential, socialExtractorFor, KNOWN_PLATFORMS } from "./platform-detector";
export { postAsText, type SocialPost } from "./social";
export { fetchUrl } from "./server-fetcher";
export { isShortLink, resolveShortLink } from "./short-links";
export { extractServerMetadata, defaultFaviconUrl } from "./metadata-extractor";
export { buildPreview, type BuiltPreview } from "./preview-builder";
export type {
  BrowserCapturePayload,
  FetchStatus,
  PlatformInfo,
  PreviewFields,
  PreviewSource,
  PreviewStatus,
  UrlFetchResult,
} from "./types";
