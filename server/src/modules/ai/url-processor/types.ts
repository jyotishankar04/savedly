export type FetchStatus =
  | "success"
  | "blocked"
  | "login_required"
  | "not_found"
  | "timeout"
  | "robots_blocked"
  | "rate_limited"
  | "server_error"
  | "invalid_url"
  | "empty_response"
  | "javascript_required"
  | "unknown";

export interface UrlFetchResult {
  status: FetchStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  html: string;
  fetchedAt: string;
  contentType: string | null;
  // Set only for a non-HTML "success" we can use (application/pdf); null otherwise.
  binaryData: Buffer | null;
}

export interface PreviewFields {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string | null;
  faviconUrl: string | null;
}

export interface PlatformInfo {
  platform: string | null;
  resourceType: string | null;
  domain: string;
  /**
   * Whether this platform has a configured credential (see getPlatformCredential) — signals that an
   * authenticated fetch path is available, without exposing the credential itself.
   */
  hasAuth: boolean;
}

export type PreviewSource = "server" | "browser" | "user" | "platform_fallback" | "generic_fallback";
export type PreviewStatus = "available" | "partial" | "unavailable";

/** What the Chrome extension (or any future browser-side capture surface) submits. */
export interface BrowserCapturePayload {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  faviconUrl?: string;
  imageUrl?: string;
  platform?: string;
  resourceType?: string;
  selectedText?: string;
  capturedAt?: string;
}
