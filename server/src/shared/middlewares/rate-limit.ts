import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ApiResponse } from "../response/api-response";

const rateLimitHandler = (_req: unknown, res: import("express").Response) => {
  res
    .status(429)
    .json(ApiResponse.error("RATE_LIMITED", "Too many requests, try again later."));
};

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

// Guessing a share password. Keyed per link as well as per IP so one
// attacker hammering one link can't lock every other visitor out of it.
export const shareUnlockRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${req.params.slug ?? ""}`,
});

// Blunts slug enumeration. Generous, because one person browsing a shared
// collection makes several of these.
export const sharePublicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Access-request spam. Per account, not per IP — requesting requires being
// signed in, so the account is the meaningful identity.
export const shareRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});

// Bug/feature report spam. No auth required to submit one, so the account
// (when signed in) or the IP is the only identity available — same
// fallback shape as shareRequestRateLimiter, just generous enough that a
// frustrated user filing a couple of real reports in a row never hits it.
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
});
