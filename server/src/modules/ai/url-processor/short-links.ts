import { assertSafeUrl } from "./server-fetcher";

// Short links stand for a page somewhere else (lnkd.in for a LinkedIn post,
// t.co, redd.it, vm.tiktok.com, bit.ly, ...): to read the post they point
// at, follow them to it first. One redirect chain, each hop checked like any
// fetch (assertSafeUrl), and only for these services.

const SHORTENERS = new Set([
  "lnkd.in", "t.co", "bit.ly", "tinyurl.com", "ow.ly", "buff.ly", "dlvr.it", "trib.al", "shorturl.at", "cutt.ly", "rebrand.ly", "is.gd", "rb.gy",
  "vm.tiktok.com", "vt.tiktok.com", "redd.it", "fb.me", "fb.watch", "instagr.am", "pin.it", "spoti.fi", "amzn.to", "yhoo.it", "lnk.to",
]);
const UA = "Mozilla/5.0 (compatible; SavedlyBot/1.0; +https://savedly.app)";
const MAX_HOPS = 5;

export function isShortLink(url: string): boolean {
  try {
    return SHORTENERS.has(new URL(url).hostname.replace(/^www\./, "").toLowerCase());
  } catch {
    return false;
  }
}

/** Where a short link leads; the link itself when it isn't one, or when it can't be followed. */
export async function resolveShortLink(url: string): Promise<string> {
  if (!isShortLink(url)) return url;
  let current = url;
  try {
    for (let hop = 0; hop < MAX_HOPS && isShortLink(current); hop++) {
      const safe = await assertSafeUrl(current);
      const response = await fetch(safe.href, { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, safe).href;
        continue;
      }
      if (!response.ok) return url;
      // Some answer with a page that names the destination instead of redirecting:
      // lnkd.in's "this link will take you to a page that's not on LinkedIn", or a meta refresh.
      const html = (await response.text()).slice(0, 200_000);
      const named =
        /<a[^>]+data-tracking-control-name="external_url_click"[^>]+href="([^"]+)"/.exec(html)?.[1] ??
        /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'>]+)/i.exec(html)?.[1];
      if (!named) return url;
      current = new URL(named.replace(/&amp;/g, "&"), safe).href;
    }
    return isShortLink(current) ? url : current;
  } catch {
    return url;
  }
}
