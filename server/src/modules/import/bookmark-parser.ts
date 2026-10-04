// Regex-based, no HTML-parsing dependency — matches this codebase's existing
// preference for hand-rolled parsing over a library for constrained formats
// (see normalize-url.ts). The Netscape Bookmark File format is simple enough
// that only the <A HREF="...">Title</A> anchors matter; folder structure
// (<H3>/<DL>) is irrelevant once we're just flattening to a URL list.
const ANCHOR_RE = /<A[^>]*HREF="([^"]+)"[^>]*>([^<]*)<\/A>/gi;

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTITY_MAP[m] ?? m);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface ParsedBookmark {
  url: string;
  title: string | null;
}

export function parseBookmarksHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  for (const match of html.matchAll(ANCHOR_RE)) {
    const url = decodeHtmlEntities(match[1] ?? "");
    if (!isHttpUrl(url)) continue;
    const title = decodeHtmlEntities(match[2]?.trim() ?? "") || null;
    results.push({ url, title });
  }
  return results;
}
