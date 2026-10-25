#!/usr/bin/env node
// Checks the server's structure, so it stays easy to add and remove features:
//
//   1. Layers only depend downward:  config < db, shared < platform < modules < app (routes, app, server).
//      Base layers never import a feature module; platform services never import one either.
//   2. No import cycles between files.
//   3. A module uses another module through its public entry point (its index.ts), not its internal files.
//      The deep imports that exist today are listed in architecture.baseline.json: the list may only shrink.
//
// Run: pnpm check:arch      (add --update-baseline after you've removed deep imports, to shrink the list)
// Entry-point scripts (seeding, reindexing, the migration bootstrap) are allowed to import anything.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../src");
const baselineFile = path.resolve(here, "architecture.baseline.json");
const ENTRY_POINTS = new Set(["server.ts", "db/seed.ts", "db/seed-core.ts", "db/seed-feature-tour.ts", "db/reindex.ts", "db/reset-plans.ts", "db/bootstrap.ts", "db/migrate.ts"]);

/** Lower number = lower layer. A file may import only from its own layer (inside its own area) or below. */
const LAYERS = [
  { name: "config", rank: 0, test: (r) => r.startsWith("config/") },
  { name: "db", rank: 1, test: (r) => r.startsWith("db/") },
  { name: "shared", rank: 1, test: (r) => r.startsWith("shared/") },
  { name: "platform", rank: 2, test: (r) => r.startsWith("platform/") },
  { name: "modules", rank: 3, test: (r) => r.startsWith("modules/") },
  { name: "app", rank: 4, test: (r) => r.startsWith("routes/") || r.startsWith("jobs/") || r === "app.ts" || r === "server.ts" },
];
// db and shared are siblings at the bottom: neither is above the other, so db may use shared's primitives and shared may read db's schema.
const layerOf = (rel) => LAYERS.find((l) => l.test(rel));
const moduleOf = (rel) => (rel.startsWith("modules/") ? rel.split("/")[1] : null);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) files.push(p);
  }
})(root);
const rel = (f) => path.relative(root, f).split(path.sep).join("/");

const resolve = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const p = path.resolve(path.dirname(from), spec);
  for (const c of [`${p}.ts`, path.join(p, "index.ts"), p]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const IMPORT = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const edges = []; // { from, to, typeOnly }
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT)) {
    const target = resolve(file, m[1] ?? m[2]);
    if (!target) continue;
    edges.push({ from: rel(file), to: rel(target), typeOnly: /^(import|export)\s+type\b/.test(m[0]) });
  }
}

const problems = [];

// 1. Layers.
for (const { from, to } of edges) {
  if (ENTRY_POINTS.has(from)) continue;
  const a = layerOf(from), b = layerOf(to);
  if (a && b && b.rank > a.rank) problems.push(`layer: ${from} (${a.name}) imports ${to} (${b.name}): a lower layer must not depend on a higher one`);
  // A module reaching into a sibling app file is never needed either.
  if (a?.name === "modules" && b?.name === "app") problems.push(`layer: ${from} imports ${to}`);
}

// 2. Cycles between files (type-only imports vanish at run time, so they don't count).
const graph = new Map();
for (const { from, to, typeOnly } of edges) if (!typeOnly) (graph.get(from) ?? graph.set(from, new Set()).get(from)).add(to);
const index = new Map(), low = new Map(), on = new Set(), stack = [], cycles = [];
let counter = 0;
const connect = (v) => {
  index.set(v, counter); low.set(v, counter); counter++; stack.push(v); on.add(v);
  for (const w of graph.get(v) ?? []) {
    if (!index.has(w)) { connect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
    else if (on.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
  }
  if (low.get(v) === index.get(v)) { const c = []; let w; do { w = stack.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) cycles.push(c); }
};
for (const f of graph.keys()) if (!index.has(f)) connect(f);
for (const c of cycles) problems.push(`cycle: ${c.sort().join(" <-> ")}`);

// 3. Modules use each other through their entry point.
const deep = new Set();
for (const { from, to } of edges) {
  const a = moduleOf(from), b = moduleOf(to);
  if (a && b && a !== b && path.posix.basename(to) !== "index.ts") deep.add(`${from} -> ${to}`);
}
const baseline = fs.existsSync(baselineFile) ? new Set(JSON.parse(fs.readFileSync(baselineFile, "utf8"))) : new Set();
if (process.argv.includes("--update-baseline")) {
  fs.writeFileSync(baselineFile, `${JSON.stringify([...deep].sort(), null, 1)}\n`);
  console.log(`baseline written: ${deep.size} deep imports`);
}
for (const d of deep) if (!baseline.has(d) && !process.argv.includes("--update-baseline")) problems.push(`deep import (new): ${d}  — import it from the module's index.ts instead`);
const shrunk = [...baseline].filter((d) => !deep.has(d)).length;

if (problems.length) {
  console.error(`✗ ${problems.length} architecture problem${problems.length === 1 ? "" : "s"}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ architecture ok: ${files.length} files, no layer violations, no import cycles, ${deep.size} known deep imports${shrunk ? ` (${shrunk} fewer than the baseline: run with --update-baseline to lock it in)` : ""}`);
