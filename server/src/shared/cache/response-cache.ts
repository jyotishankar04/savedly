import { createHash, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { cacheRedis } from "../../config/redis";
import { extractToken } from "../middlewares/authenticate";
import { VAULT_TOKEN_COOKIE } from "../utils/cookies";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../utils/logger";

/**
 * Cache of GET responses, in Redis: per user for their own data, and one
 * shared copy for the few public reads every page load makes.
 *
 * Every entry is keyed by the user and that user's "cache version". Anything
 * that changes a user's data replaces the version (bumpUserCache), so all of
 * their cached reads miss from then on — no per-route invalidation lists to
 * keep in sync. A user's own write bumps before its response is sent, so the
 * refetch the client fires next always reads fresh data. Changes that come
 * from elsewhere (the ingestion worker, a billing webhook, an admin) bump
 * explicitly; whatever doesn't is bounded by the TTL. The shared copy works
 * the same way with a single version, replaced by any admin write.
 *
 * Redis being slow or down only ever costs the cache: every call fails open.
 */

const TTL_SECONDS = 60;
const VERSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_BODY_BYTES = 512 * 1024;

// Only reads of the signed-in user's own data. Left out on purpose: /admin
// (must be live), /billing (follows webhooks), /vault and /files, and the
// public or unauthenticated routes, which have no user to key on.
const CACHEABLE_PREFIXES = [
  "/auth/me",
  "/settings",
  "/memories",
  "/collections",
  "/tags",
  "/insights",
  "/notifications",
  "/shares",
  "/search",
  "/plans/me",
  "/ai/threads",
  "/ai-settings",
  "/import",
  "/integrations/calendar/connections",
  "/integrations/calendar/events",
];

// The same for every visitor, signed in or not, and changed only by an admin:
// the announcement banner, the maintenance notice, the plan list, the sign-in
// options and the instance config.
const PUBLIC_PATHS = new Set(["/announcements/active", "/whats-new/active", "/maintenance/status", "/plans", "/auth/providers", "/config"]);
const PUBLIC_SCOPE = "public";

// A fresh self-hosted install reports this until its first account exists,
// and that sign-up isn't an admin write, so it's never stored.
const NEEDS_SETUP = '"needsSetup":true';

// Downloads, and the status the client polls while a save is being processed.
const NEVER_CACHED = [/^\/memories\/export/, /\/processing-status$/, /^\/ai-settings\/models/];

// A memory still being processed changes without the user doing anything, so
// a response that shows one is never stored.
const IN_FLUX = '"status":"processing"';

const versionKey = (scope: string) => `rc:v:${scope}`;

function entryKey(scope: string, version: string, url: string): string {
  return `rc:${scope}:${version}:${createHash("sha1").update(url).digest("base64url")}`;
}

/** Drops every cached read for this user. Safe to call from anywhere; never throws. */
export async function bumpUserCache(userId: string): Promise<void> {
  try {
    await cacheRedis.set(versionKey(userId), randomUUID(), "EX", VERSION_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, userId }, "[cache] could not invalidate; cached reads expire within the TTL");
  }
}

/** Drops the shared copy of the public reads. Never throws. */
export async function bumpPublicCache(): Promise<void> {
  try {
    await cacheRedis.set(versionKey(PUBLIC_SCOPE), randomUUID(), "EX", VERSION_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "[cache] could not invalidate the public cache; it expires within the TTL");
  }
}

function userIdOf(req: Request): string | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    return verifyAccessToken(token).sub;
  } catch {
    return null;
  }
}

function isCacheable(req: Request): boolean {
  if (req.method !== "GET") return false;
  if (!CACHEABLE_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) return false;
  if (NEVER_CACHED.some((pattern) => pattern.test(req.path))) return false;
  // An unlocked vault session reads content the locked one must never see.
  if (req.cookies?.[VAULT_TOKEN_COOKIE] || "isVaulted" in req.query) return false;
  return true;
}

/** A write: invalidate before the response leaves, so the client's refetch can't race it. */
function invalidateOnWrite(userId: string, req: Request, res: Response): void {
  let bumped: Promise<unknown> | null = null;
  // Everything an admin can change that a public read shows lives under /admin.
  const adminWrite = req.path.startsWith("/admin");
  const bump = () => (bumped ??= Promise.all([bumpUserCache(userId), adminWrite ? bumpPublicCache() : undefined]));

  const send = res.send.bind(res);
  res.send = ((body?: unknown) => {
    void bump().finally(() => send(body));
    return res;
  }) as typeof res.send;

  // Streams and bare res.end() never pass through res.send.
  res.on("finish", () => void bump());
}

export async function responseCache(req: Request, res: Response, next: NextFunction) {
  const isPublic = req.method === "GET" && PUBLIC_PATHS.has(req.path);
  const userId = isPublic ? null : userIdOf(req);
  if (!isPublic && !userId) return next();

  // A POST that only renders something back (the email composer's preview,
  // fired on every edit) changes no data, so there's nothing to invalidate.
  const readOnlyPost = req.method === "POST" && req.path.endsWith("/preview");
  if (userId && !readOnlyPost && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    invalidateOnWrite(userId, req, res);
    return next();
  }
  if (!isPublic && !isCacheable(req)) return next();

  const scope = userId ?? PUBLIC_SCOPE;
  let key: string;
  try {
    const version = (await cacheRedis.get(versionKey(scope))) ?? "0";
    key = entryKey(scope, version, req.originalUrl);
    const hit = await cacheRedis.get(key);
    if (hit !== null) {
      res.status(200).set("Content-Type", "application/json; charset=utf-8").set("X-Cache", "HIT").send(hit);
      return;
    }
  } catch {
    return next();
  }

  const send = res.send.bind(res);
  res.send = ((body?: unknown) => {
    if (
      res.statusCode === 200 &&
      typeof body === "string" &&
      body.length <= MAX_BODY_BYTES &&
      !res.getHeader("Set-Cookie") &&
      String(res.getHeader("Content-Type") ?? "").includes("application/json") &&
      !body.includes(IN_FLUX) &&
      !body.includes(NEEDS_SETUP)
    ) {
      cacheRedis.set(key, body, "EX", TTL_SECONDS).catch(() => {});
    }
    return send(body);
  }) as typeof res.send;
  res.set("X-Cache", "MISS");
  next();
}
