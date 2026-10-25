import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ApiResponse } from "../response/api-response";

const rateLimitHandler = (_req: unknown, res: import("express").Response) => {
  res
    .status(429)
    .json(ApiResponse.error("RATE_LIMITED", "Too many requests, try again later."));
};

// A per-IP ceiling on everything, far above what browsing reaches (a dashboard makes about a dozen
// requests); narrower limiters apply on top. In memory, so per API process.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // The uptime check and the payment provider's webhook must never be refused.
  skip: (req) => req.path.startsWith("/health") || req.path === "/billing/webhook",
});

export const oauthRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Email + password sign-in and registration: slows password guessing.
export const passwordAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Share password guessing. Keyed per link as well as per IP, so one attacker on one link can't lock
// every other visitor out.
export const shareUnlockRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${req.params.slug ?? ""}`,
});

// Blunts slug enumeration; generous, since browsing a shared collection makes several of these.
export const sharePublicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Access-request spam: per account, not IP, since requesting needs sign-in.
export const shareRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});

// Report spam. No auth is required, so the account (when signed in) or IP is the only identity, and
// generous enough that a few real reports in a row don't hit it. The route reads sign-in first
// (optionalAuthenticate).
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});

// A note's "Write with AI" (memory/rewrite.service.ts): after a note's first AI use in a month,
// rewriting again doesn't count against the plan, so this stops it being run in a loop. Per
// account.
export const rewriteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});

// The public contact form saves and emails each message, so a script mustn't fill the inbox. Per
// account when signed in, else per IP, so people behind one office address don't use up each
// other's.
export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});

// The public help box (modules/help-assistant): nobody is signed in and each question costs an AI
// call. A person asks a handful; a script thousands.
export const helpAskMinuteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
export const helpAskDailyRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
