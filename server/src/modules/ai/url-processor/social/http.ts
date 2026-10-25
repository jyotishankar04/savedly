// Platform endpoints are fixed known hosts, so no SSRF checks beyond fetchUrl's for the saved page.

const TIMEOUT_MS = 10_000;
export const SAVEDLY_UA = "Mozilla/5.0 (compatible; SavedlyBot/1.0; +https://savedly.app)";

/** A GET or POST answering JSON; null on any failure (timeout, an error status, not JSON). */
export async function fetchJson<T>(url: string, init: RequestInit & { userAgent?: string } = {}): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": init.userAgent ?? SAVEDLY_UA, "Accept-Language": "en", ...(init.headers as Record<string, string> | undefined) },
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** HTML entities as text: &amp;, &#x2019;, &#8217; and the common named ones. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

/** "60M", "4.1K", "1,234" as a number. */
export function parseCount(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const match = /^([\d.,]+)\s*([KMB])?$/i.exec(value.trim());
  if (!match) return undefined;
  const base = Number(match[1]!.replace(/,/g, ""));
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] ?? "").toUpperCase() as "K" | "M" | "B"] ?? 1;
  return Number.isFinite(base) ? Math.round(base * scale) : undefined;
}
