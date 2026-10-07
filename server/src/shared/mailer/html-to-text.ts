// Every email goes out with a plain-text version beside the designed one.
// Mail that is HTML only reads as a marketing blast to spam and tab filters;
// real person-to-person and transactional mail carries both. It's also what
// a recipient sees if their mail app shows text only.
//
// The templates (./templates.ts) are our own, table-based HTML, so this
// doesn't need to be a general converter: it turns their structure into
// readable lines and links into "label: address".

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&middot;": "·",
  "&rarr;": "→",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&#8226;": "•",
  "&#10003;": "✓",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

export function htmlToText(html: string): string {
  const text = html
    // Not part of the message: the document head, and the hidden inbox-preview line.
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, "")
    // A link becomes "label: address", so it can still be followed.
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const name = label.replace(/<[^>]+>/g, "").trim();
      return name && name !== href ? `${name}: ${href}` : href;
    })
    .replace(/<img\b[^>]*alt="([^"]+)"[^>]*>/gi, "[$1]")
    .replace(/<br\s*\/?>/gi, "\n")
    // Block-level closers end a line; cells in a row are separated by a space.
    .replace(/<\/(p|h1|h2|h3|div|tr|table|li)>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "");

  const lines = decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line, i, all) => line !== "" || all[i - 1] !== "");

  // The templates put a marker (a step number, a bullet, a month, a "·"
  // between footer links) in its own table cell, which lands on its own
  // line. Join each one to the text it belongs with.
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextIndex = lines.findIndex((candidate, j) => j > i && candidate !== "");
    const next = nextIndex === -1 ? null : lines[nextIndex];
    if (next !== null && /^[A-Z]{3}$/.test(line) && /^\d{1,2}$/.test(next)) {
      out.push(`${line} ${next}`);
      i = nextIndex;
    } else if (next !== null && /^\d{1,2}$/.test(line)) {
      out.push(`${line}. ${next}`);
      i = nextIndex;
    } else if (next !== null && line === "•") {
      out.push(`• ${next}`);
      i = nextIndex;
    } else if (line === "·" && out.length > 0 && next !== null) {
      while (out[out.length - 1] === "") out.pop();
      out[out.length - 1] = `${out[out.length - 1]} · ${next}`;
      i = nextIndex;
    } else {
      out.push(line);
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
