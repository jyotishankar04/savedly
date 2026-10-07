import dns from "node:dns/promises";
import type { FetchStatus, UrlFetchResult } from "./types";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;
const ROBOTS_TIMEOUT_MS = 4000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const USER_AGENT = "Mozilla/5.0 (compatible; SavedlyBot/1.0; +https://savedly.app)";

class UrlSafetyError extends Error {
  constructor(public status: FetchStatus) {
    super(`Blocked unsafe URL: ${status}`);
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7));
  return false;
}

/**
 * Blocks SSRF targets before any request leaves the process: protocol
 * allowlist, localhost, and — via DNS resolution, so a hostname can't just
 * *point at* a private/cloud-metadata address — every resolved IP. Every
 * redirect hop re-runs this, not just the original URL.
 */
async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlSafetyError("invalid_url");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UrlSafetyError("invalid_url");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0") {
    throw new UrlSafetyError("invalid_url");
  }

  let addresses: string[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })).map((r) => r.address);
  } catch {
    throw new UrlSafetyError("not_found");
  }

  for (const addr of addresses) {
    if (addr.includes(":") ? isPrivateIPv6(addr) : isPrivateIPv4(addr)) {
      throw new UrlSafetyError("invalid_url");
    }
  }

  return url;
}

function parseRobotsTxt(text: string, pathname: string): boolean {
  let appliesToUs = false;
  const disallows: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0]?.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      appliesToUs = value === "*" || value.toLowerCase().includes("savedlybot");
    } else if (appliesToUs && key === "disallow" && value) {
      disallows.push(value);
    }
  }
  return !disallows.some((rule) => pathname.startsWith(rule));
}

/** We don't try to get around robots.txt — if it disallows us, we don't fetch the page at all. Fails open (allowed) on any error reaching robots.txt itself. */
async function isAllowedByRobots(url: URL): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", url.origin);
    await assertSafeUrl(robotsUrl.href);
    const response = await fetch(robotsUrl.href, {
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return true;
    return parseRobotsTxt(await response.text(), url.pathname);
  } catch {
    return true;
  }
}

async function readBounded(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

function looksLikeJsShell(html: string): boolean {
  const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length < 500 && /enable javascript|noscript|requires javascript/i.test(html);
}

/** SSRF-safe, robots-respecting fetch with a normalized outcome — never throws; every failure mode maps to a FetchStatus instead. */
export async function fetchUrl(rawUrl: string): Promise<UrlFetchResult> {
  const fetchedAt = new Date().toISOString();
  let currentUrl = rawUrl;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const safeUrl = await assertSafeUrl(currentUrl);

      if (!(await isAllowedByRobots(safeUrl))) {
        return { status: "robots_blocked", httpStatus: null, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
      }

      const response = await fetch(safeUrl.href, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) {
          return { status: "unknown", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
        }
        currentUrl = new URL(location, safeUrl).href;
        continue;
      }

      const contentType = response.headers.get("content-type");

      if (response.status === 401) {
        return { status: "login_required", httpStatus: 401, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (response.status === 403) {
        return { status: "blocked", httpStatus: 403, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (response.status === 404) {
        return { status: "not_found", httpStatus: 404, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (response.status === 429) {
        return { status: "rate_limited", httpStatus: 429, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (response.status >= 500) {
        return { status: "server_error", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (!response.ok) {
        return { status: "blocked", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }

      const contentLength = response.headers.get("content-length");
      const tooLarge = !!contentLength && Number(contentLength) > MAX_RESPONSE_BYTES;

      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        // A PDF is the one non-HTML content-type we can actually do
        // something with (extractPdfContent) — everything else (images
        // included; a vision model can just be pointed at the URL directly,
        // no download needed) stays a no-body early return, as before.
        if (contentType.includes("application/pdf") && !tooLarge) {
          const binaryData = await readBounded(response, MAX_RESPONSE_BYTES);
          return { status: "success", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData };
        }
        return { status: "success", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }

      if (tooLarge) {
        return { status: "success", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }

      const htmlBuffer = await readBounded(response, MAX_RESPONSE_BYTES);
      const html = htmlBuffer.toString("utf-8");
      if (!html.trim()) {
        return { status: "empty_response", httpStatus: response.status, finalUrl: currentUrl, html: "", fetchedAt, contentType, binaryData: null };
      }
      if (looksLikeJsShell(html)) {
        return { status: "javascript_required", httpStatus: response.status, finalUrl: currentUrl, html, fetchedAt, contentType, binaryData: null };
      }

      return { status: "success", httpStatus: response.status, finalUrl: currentUrl, html, fetchedAt, contentType, binaryData: null };
    }

    return { status: "unknown", httpStatus: null, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
  } catch (err) {
    if (err instanceof UrlSafetyError) {
      return { status: err.status, httpStatus: null, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
    }
    if (err instanceof Error && err.name === "TimeoutError") {
      return { status: "timeout", httpStatus: null, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
    }
    return { status: "unknown", httpStatus: null, finalUrl: currentUrl, html: "", fetchedAt, contentType: null, binaryData: null };
  }
}
