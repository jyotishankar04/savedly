#!/usr/bin/env bash
# Times the API's round trips to Postgres, Redis and Pinecone from inside the
# running API container (same network position and env as the API itself).
# Prints timings only, never connection strings. Run on the instance:
#   bash latency-probe.sh
set -euo pipefail
cd "${APP_DIR:-/opt/saveforlatter}"

docker compose exec -T server node --input-type=commonjs - <<'PROBE'
const { Client } = require("pg");
const Redis = require("ioredis");
const { randomUUID } = require("node:crypto");

const now = () => Number(process.hrtime.bigint()) / 1e6;
async function timed(fn) { const t = now(); await fn(); return now() - t; }
async function sample(n, fn) { const out = []; for (let i = 0; i < n; i++) out.push(await timed(fn)); return out.sort((a, b) => a - b); }
const fmt = (a) => `min ${a[0].toFixed(1)}  median ${a[Math.floor(a.length / 2)].toFixed(1)}  max ${a[a.length - 1].toFixed(1)} ms  (${a.length} runs)`;
const row = (label, text) => console.log(label.padEnd(38) + text);
const fail = (label, e) => row(label, "FAILED: " + String(e && e.message ? e.message : e).slice(0, 90));

async function postgres() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    row("postgres connect", (await timed(() => client.connect())).toFixed(1) + " ms");
    row("postgres select 1", fmt(await sample(20, () => client.query("select 1"))));
    const id = randomUUID();
    row("postgres indexed count", fmt(await sample(10, () => client.query("select count(*) from memories where user_id = $1", [id]))));
    row("postgres flag lookup (per request)", fmt(await sample(10, () => client.query("select value from feature_flags where key = $1 limit 1", ["maintenance.enabled"]))));
    const v = await client.query("select split_part(version(), ' on ', 1) as v, current_setting('TimeZone') as tz");
    row("postgres server", `${v.rows[0].v}, timezone ${v.rows[0].tz}`);
  } catch (e) { fail("postgres", e); } finally { await client.end().catch(() => {}); }
}

async function redis() {
  const r = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 10000 });
  r.on("error", () => {});
  try {
    row("redis connect", (await timed(() => r.connect())).toFixed(1) + " ms");
    row("redis ping", fmt(await sample(20, () => r.ping())));
  } catch (e) { fail("redis", e); } finally { r.disconnect(); }
}

async function pinecone() {
  const host = (process.env.PINECONE_INDEX_HOST || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host || !process.env.PINECONE_API_KEY) return row("pinecone", "not configured");
  const call = async (path, body) => {
    const res = await fetch(`https://${host}${path}`, { method: "POST", headers: { "Api-Key": process.env.PINECONE_API_KEY, "X-Pinecone-API-Version": "2025-04", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text();
  };
  const vector = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0.001));
  try {
    row("pinecone first call (new TLS)", (await timed(() => call("/describe_index_stats", {}))).toFixed(1) + " ms");
    row("pinecone search query", fmt(await sample(5, () => call("/query", { vector, topK: 1, filter: { userId: { $eq: "latency-probe" } } }))));
  } catch (e) { fail("pinecone", e); }
}

(async () => {
  console.log("Round trips from the API container, " + new Date().toISOString());
  await postgres(); await redis(); await pinecone();
  process.exit(0);
})();
PROBE
