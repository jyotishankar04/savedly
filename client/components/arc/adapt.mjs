// Makes freshly installed Arc components fit this app. Run with `pnpm arc:adapt`
// after every `shadcn add @uiarc/...`; it is safe to run again and again.
//
// Arc's components use three CSS variable names that mean something else
// here (see foundation.css). This renames them inside components/arc only.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const RENAMES = [
  [/--accent-foreground(?![\w-])/g, "--arc-accent-foreground"],
  [/--accent(?![\w-])/g, "--arc-accent"],
  [/--text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)(?![\w-])/g, "--arc-text-$1"],
];
// Arc's primary button is black on white (white on black in the dark theme).
// Here the main action is the brand blue everywhere else, so the button
// follows: its fill and text come from the accent, not the text colour.
const PATCHES = {
  "button/button.module.css": [
    [".primary { color: var(--background); background: var(--foreground); border-color: var(--foreground); }", ".primary { color: var(--arc-accent-foreground); background: var(--arc-accent); border-color: var(--arc-accent); }"],
  ],
};
// This app's own files in the folder: never rewritten.
const SKIP = new Set(["foundation.css", "adapt.mjs"]);

// `pnpm arc:adapt <id> [<id>…]` first re-downloads those components exactly as
// Arc publishes them, then adapts them. Needed for every Arc component built on
// Radix (dialog, bottom-sheet, tabs…): this project's shadcn config targets
// Base UI, so `shadcn add` rewrites Radix's `asChild` into a `render` prop that
// Radix doesn't have, and the component then fails to compile.
for (const id of process.argv.slice(2)) {
  const response = await fetch(`https://uiarc.dev/r/${id}.json`);
  if (!response.ok) throw new Error(`Couldn't download ${id}: ${response.status}`);
  const item = await response.json();
  for (const file of item.files ?? []) {
    // Targets look like "@components/arc/<id>/<file>".
    const target = String(file.target ?? "").replace(/^@components\/arc\//, "");
    if (!target || target.includes("..") || target === file.target) continue;
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dirname(join(root, target)), { recursive: true });
    writeFileSync(join(root, target), file.content);
    console.log("downloaded", target);
  }
}

let changed = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(css|tsx?)$/.test(name) && !SKIP.has(name)) {
      const before = readFileSync(path, "utf8");
      const renamed = RENAMES.reduce((text, [from, to]) => text.replace(from, to), before);
      const after = (PATCHES[path.slice(root.length + 1)] ?? []).reduce((text, [from, to]) => text.replace(from, to), renamed);
      if (after !== before) {
        writeFileSync(path, after);
        changed++;
        console.log("adapted", path.slice(root.length + 1));
      }
    }
  }
};
walk(root);
console.log(changed ? `${changed} file(s) adapted.` : "Nothing to adapt.");
