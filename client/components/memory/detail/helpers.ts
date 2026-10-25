import {
  GlobeIcon as Globe,
  Video01Icon as Video,
  FileTextIcon as FileText,
  StickyNote01Icon as StickyNote,
  Image01Icon as ImageIcon,
  Mic01Icon as Mic,
} from "@hugeicons/core-free-icons";
import type { MemoryDetail } from "@/types/memory";

export function attachmentFilename(fileUrl: string): string {
  return fileUrl.split("/").pop() ?? fileUrl;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const TYPE_META = {
  web: { icon: Globe, label: "Link" },
  video: { icon: Video, label: "Video" },
  note: { icon: StickyNote, label: "Note" },
  image: { icon: ImageIcon, label: "Image" },
  document: { icon: FileText, label: "Document" },
  voice: { icon: Mic, label: "Voice note" },
} as const;

// A note that's really a command or a code snippet reads better in mono,
// with its line breaks and indentation kept exactly.
const COMMAND_START = /^\s*(\$ |sudo |docker |npm |npx |pnpm |yarn |git |curl |wget |cd |ls |kubectl |python3? |node |go |cargo |brew |apt |ssh |export |echo )/;
export function looksLikeCode(memory: MemoryDetail): boolean {
  const text = memory.content ?? "";
  if (!text.trim()) return false;
  // Written in the note editor (fences, lists, headings, quotes): shown formatted, code blocks included.
  if (/^\s*(#{1,6} |[-*+] |\d+[.)] |> )|```/m.test(text)) return false;
  if (memory.contentType && /code|command|snippet|script/i.test(memory.contentType)) return true;
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.length > 0 && lines.every((l) => COMMAND_START.test(l) || /^\s{2,}\S/.test(l) || /[;{}]\s*$/.test(l));
}

// Platforms whose posts and videos Savedly can read (server: url-processor/social), and the
// short links that lead to them (server: url-processor/short-links.ts).
export const SOCIAL_PLATFORMS = new Set(["youtube", "x", "instagram", "tiktok", "threads", "linkedin", "reddit", "facebook"]);
const SHORT_LINK_HOSTS = new Set(["lnkd.in", "t.co", "redd.it", "vm.tiktok.com", "vt.tiktok.com", "fb.me", "fb.watch", "instagr.am", "bit.ly", "tinyurl.com", "ow.ly", "buff.ly"]);
export function isShortLink(url: string): boolean {
  try {
    return SHORT_LINK_HOSTS.has(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

export function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "en.wikipedia.org" from a link, for the source list. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
