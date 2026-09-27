import { stringify } from "yaml";
import { zipSync, strToU8 } from "fflate";
import type { MemoryDetail } from "./memory.service";

// "Export as OKF": the user's library as an Open Knowledge Format v0.2 bundle
// (github.com/GoogleCloudPlatform/open-knowledge-format/SPEC.md). A folder of
// Markdown files, one per memory and per collection, each with YAML front
// matter whose `type` is the only required field, plus index.md listings and a
// log.md. Any OKF-aware agent, a Git repo, or a person can read it as-is.

export interface OkfCollection {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

const ROOT = "saveforlatter-okf";

const MEMORY_TYPE: Record<string, string> = {
  web: "Web Page",
  video: "Video",
  note: "Note",
  image: "Image",
  document: "Document",
  voice: "Voice Memo",
};

/** "Capitalize First & Last!" -> "capitalize-first-last-7dabf7": readable, stable, unique. */
function slug(text: string, id: string): string {
  const base = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base || "untitled"}-${id.replace(/-/g, "").slice(0, 6)}`;
}

/** YAML front matter via a real serializer, so quotes, colons and newlines in titles stay valid. */
function frontMatter(fields: Record<string, unknown>): string {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)));
  return `---\n${stringify(clean, { lineWidth: 0 }).trimEnd()}\n---\n`;
}

/** One line of Markdown link text: brackets and newlines would break the link. */
function linkText(text: string): string {
  return text.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim() || "Untitled";
}

function oneLine(text: string | null | undefined, max = 160): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const iso = (d: Date) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");

/** Path -> file contents, relative to the bundle root (no I/O). */
export function buildOkfBundle(items: MemoryDetail[], collections: OkfCollection[], now = new Date()): Record<string, string> {
  const files: Record<string, string> = {};
  const memorySlug = new Map(items.map((m) => [m.id, slug(m.title, m.id)]));
  const collectionSlug = new Map(collections.map((c) => [c.id, slug(c.name, c.id)]));
  const membersByCollection = new Map<string, MemoryDetail[]>();
  for (const m of items) {
    for (const c of m.collections) {
      if (!collectionSlug.has(c.id)) continue;
      membersByCollection.set(c.id, [...(membersByCollection.get(c.id) ?? []), m]);
    }
  }
  const generated = { by: "process:saveforlatter-export", at: iso(now) };

  // --- memories -------------------------------------------------------------
  for (const m of items) {
    const resource = m.url ?? m.attachments[0]?.fileUrl ?? undefined;
    const memberOf = m.collections.filter((c) => collectionSlug.has(c.id));
    const body: string[] = [`# ${m.title || "Untitled"}`, ""];
    if (m.description) body.push(m.description.trim(), "");
    if (m.content && m.content.trim() && m.content.trim() !== m.description?.trim()) {
      body.push("## Content", "", m.content.trim(), "");
    }
    if (m.url) body.push("## Source", "", `<${m.url}>`, "");
    if (m.attachments.length > 0) {
      body.push("## Attachments", "", ...m.attachments.map((a) => `* <${a.fileUrl}>${a.mimeType ? ` (${a.mimeType})` : ""}`), "");
    }
    if (memberOf.length > 0) {
      body.push("## Collections", "", ...memberOf.map((c) => `* [${linkText(c.name)}](/collections/${collectionSlug.get(c.id)}.md)`), "");
    }
    files[`memories/${memorySlug.get(m.id)}.md`] =
      frontMatter({
        type: MEMORY_TYPE[m.type] ?? "Memory",
        title: m.title || "Untitled",
        description: oneLine(m.description, 300) || undefined,
        resource,
        tags: m.tags,
        timestamp: iso(m.createdAt),
        category: m.resourceCategory ?? undefined,
        content_type: m.contentType ?? undefined,
        favorite: m.isFavorite || undefined,
        archived: m.isArchived || undefined,
        event_at: m.eventAt ? iso(m.eventAt) : undefined,
        collections: memberOf.map((c) => c.name),
        saveforlatter_id: m.id,
        generated,
      }) + `\n${body.join("\n").trimEnd()}\n`;
  }

  // --- collections ----------------------------------------------------------
  for (const c of collections) {
    const members = membersByCollection.get(c.id) ?? [];
    const body = [`# ${c.name}`, ""];
    if (c.description) body.push(c.description.trim(), "");
    body.push("## Memories", "");
    body.push(
      ...(members.length > 0
        ? members.map((m) => `* [${linkText(m.title)}](/memories/${memorySlug.get(m.id)}.md)${m.description ? ` - ${oneLine(m.description, 120)}` : ""}`)
        : ["_No memories in this collection yet._"]),
    );
    files[`collections/${collectionSlug.get(c.id)}.md`] =
      frontMatter({
        type: "Collection",
        title: c.name,
        description: oneLine(c.description, 300) || undefined,
        timestamp: iso(c.createdAt),
        memory_count: members.length,
        saveforlatter_id: c.id,
        generated,
      }) + `\n${body.join("\n").trimEnd()}\n`;
  }

  // --- indexes and log (reserved files: no front matter except the root index) --
  files["memories/index.md"] = [
    "# Memories",
    "",
    ...items.map((m) => `* [${linkText(m.title)}](/memories/${memorySlug.get(m.id)}.md)${m.description ? ` - ${oneLine(m.description, 120)}` : ""}`),
    "",
  ].join("\n");
  files["collections/index.md"] = [
    "# Collections",
    "",
    ...(collections.length > 0
      ? collections.map((c) => `* [${linkText(c.name)}](/collections/${collectionSlug.get(c.id)}.md)${c.description ? ` - ${oneLine(c.description, 120)}` : ""}`)
      : ["_No collections yet._"]),
    "",
  ].join("\n");
  files["index.md"] = [
    frontMatter({ okf_version: "0.2" }),
    "# SaveForLatter library",
    "",
    `Everything saved in SaveForLatter as of ${iso(now).slice(0, 10)}: ${items.length} memories and ${collections.length} collections, in the Open Knowledge Format. Vault and Trash contents are not included.`,
    "",
    `* [Memories](/memories/index.md) - every saved link, note, image, document and voice memo`,
    `* [Collections](/collections/index.md) - how those memories are organized`,
    "",
  ].join("\n");
  files["log.md"] = [
    "# Update Log",
    "",
    `## ${iso(now).slice(0, 10)}`,
    `* **Creation**: Exported ${items.length} memories and ${collections.length} collections from SaveForLatter.`,
    "",
  ].join("\n");

  return files;
}

/** The bundle as a zip, everything under one top-level folder. */
export function zipOkfBundle(files: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [`${ROOT}/${path}`, strToU8(text)])), { level: 6 });
}
