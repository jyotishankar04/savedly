import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The Help Center's guides, read from content/docs (MDX). Used at build time
// by the Ask assistant's /api/help route, which is statically generated — so
// nothing here runs on the server per request.

export interface HelpDocStep {
  title: string;
  body: string;
}

export interface HelpDocAction {
  label: string;
  href: string;
}

export interface HelpDocGuide {
  slug: string;
  category: string;
  title: string;
  summary: string;
  intro: string;
  steps: HelpDocStep[];
  actions: HelpDocAction[];
  href: string;
}

const DOCS_DIR = join(process.cwd(), "content", "docs");

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return mdxFiles(path);
    return name.endsWith(".mdx") ? [path] : [];
  });
}

/** Reads the `key: value` pairs between the leading `---` fences; quoted values are JSON strings. */
function frontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    data[key] = value.startsWith('"') ? (JSON.parse(value) as string) : value;
  }
  return { data, body: raw.slice(match[0].length) };
}

/** `<GuideActions actions={[{ label: "…", href: "…" }, …]} />` → the action list. */
function actionsOf(body: string): HelpDocAction[] {
  const line = body.match(/<GuideActions actions=\{\[([\s\S]*?)\]\} \/>/);
  if (!line) return [];
  return [...line[1].matchAll(/\{ label: ("(?:[^"\\]|\\.)*"), href: ("(?:[^"\\]|\\.)*") \}/g)].map(
    ([, label, href]) => ({ label: JSON.parse(label) as string, href: JSON.parse(href) as string }),
  );
}

/** Prose only: drops components, images and blank runs, keeps code fences as written. */
function prose(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*<[A-Za-z]/.test(line) && !/^\s*!\[/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function guideFrom(path: string): HelpDocGuide {
  const parts = relative(DOCS_DIR, path).split(sep);
  const category = parts[0];
  const slug = parts[parts.length - 1].replace(/\.mdx$/, "");
  const { data, body } = frontmatter(readFileSync(path, "utf8"));

  // Everything before the first "## " heading is the intro; each heading starts a step.
  const [head, ...sections] = body.split(/^## /m);
  const steps = sections.map((section) => {
    const newline = section.indexOf("\n");
    return { title: section.slice(0, newline).trim(), body: prose(section.slice(newline + 1)) };
  });

  return {
    slug,
    category,
    title: data.title ?? slug,
    summary: data.description ?? "",
    intro: prose(head),
    steps,
    actions: actionsOf(body),
    href: `/help/docs/${category}/${slug}`,
  };
}

/** Every guide in the docs space, in folder order (index.mdx is the landing page, not a guide). */
export function helpDocGuides(): HelpDocGuide[] {
  return mdxFiles(DOCS_DIR)
    .filter((path) => !path.endsWith(`${sep}index.mdx`))
    .map(guideFrom);
}
