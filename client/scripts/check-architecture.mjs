#!/usr/bin/env node
// Checks the client's structure, so it stays easy to add and remove features:
//
//   1. Layers only depend downward:  lib, types < context, hooks < components < app.
//      Plain helpers never import UI; a component never imports a page.
//   2. No import cycles between files (type-only imports are ignored).
//
// The upward imports that exist today are listed in architecture.baseline.json: the list may only shrink.
// Run: pnpm check:arch      (add --update-baseline after you've removed some, to shrink the list)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const baselineFile = path.resolve(here, "architecture.baseline.json");
const SKIP = /node_modules|\.next|\.source|[\\/]public[\\/]|[\\/]content[\\/]|[\\/]scripts[\\/]/;

const LAYERS = [
  { name: "lib/types", rank: 0, test: (r) => /^(lib|types)\//.test(r) },
  { name: "context/hooks", rank: 1, test: (r) => /^(context|hooks)\//.test(r) },
  { name: "components", rank: 2, test: (r) => r.startsWith("components/") },
  { name: "app", rank: 3, test: (r) => r.startsWith("app/") },
];
const layerOf = (rel) => LAYERS.find((l) => l.test(rel));

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p) && !p.endsWith(".d.ts")) files.push(p);
  }
})(root);
const known = new Set(files);
const rel = (f) => path.relative(root, f).split(path.sep).join("/");

const resolve = (from, spec) => {
  const p = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!p) return null;
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts"), path.join(p, "index.tsx")]) if (known.has(c)) return c;
  return null;
};
const IMPORT = /(?:import|export)\s(type\s)?[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const edges = []; // { from, to, typeOnly }
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT)) {
    const target = resolve(file, m[2] ?? m[3]);
    if (target) edges.push({ from: rel(file), to: rel(target), typeOnly: !!m[1] });
  }
}

const problems = [];

// 1. Layers
const upward = edges
  .filter((e) => e.from !== e.to)
  .filter((e) => {
    const a = layerOf(e.from), b = layerOf(e.to);
    return a && b && a.rank < b.rank;
  })
  .map((e) => `${e.from} -> ${e.to}`);
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, "utf8")) : [];
const allowed = new Set(baseline);
const fresh = [...new Set(upward)].filter((x) => !allowed.has(x));
for (const x of fresh) problems.push(`layer: ${x} (a lower layer imports a higher one)`);
const stale = baseline.filter((x) => !upward.includes(x));

// 2. Cycles (value imports only; a file importing itself is skipped)
const graph = new Map();
for (const e of edges) if (!e.typeOnly && e.from !== e.to) (graph.get(e.from) ?? graph.set(e.from, []).get(e.from)).push(e.to);
const color = new Map(), stack = [], cycles = new Set();
const visit = (n) => {
  color.set(n, 1);
  stack.push(n);
  for (const m of graph.get(n) ?? []) {
    if (color.get(m) === 1) cycles.add([...stack.slice(stack.indexOf(m)), m].join(" -> "));
    else if (!color.get(m)) visit(m);
  }
  stack.pop();
  color.set(n, 2);
};
for (const n of graph.keys()) if (!color.get(n)) visit(n);
for (const c of cycles) problems.push(`cycle: ${c}`);

if (process.argv.includes("--update-baseline")) {
  fs.writeFileSync(baselineFile, `${JSON.stringify([...new Set(upward)].sort(), null, 2)}\n`);
  console.log(`baseline updated: ${new Set(upward).size} upward imports`);
  process.exit(0);
}
if (problems.length) {
  console.error(`✗ architecture: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
const note = stale.length ? ` (${stale.length} baseline entries are gone: run with --update-baseline)` : "";
console.log(`✓ architecture ok: ${files.length} files, ${baseline.length - stale.length} known upward imports, no import cycles${note}`);
