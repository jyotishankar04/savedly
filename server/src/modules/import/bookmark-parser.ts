import { isHttpUrl } from "../../shared/utils/is-http-url";

// Regex-based with no HTML parser, like the rest of the codebase's constrained-format parsing
// (normalize-url.ts). Only the <A HREF> anchors matter; folders are flattened.
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
