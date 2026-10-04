import type { NextFunction, Request, Response } from "express";
import { extractToken } from "./authenticate";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Populates `req.user` when the caller happens to be signed in, and does
 * nothing at all when they aren't.
 *
 * For routes that serve both audiences — a shared link is readable by an
 * anonymous visitor, its owner, and the people it was shared with, and which
 * one you are decides what comes back. `authenticate` can't express that: it
 * 401s before the handler runs.
 *
 * An invalid or expired token is treated as "anonymous" rather than an error,
 * for the same reason maintenance-mode.ts soft-decodes: a stale cookie must
 * not turn a public page into a failure. Handlers that need to tell "expired
 * session" apart from "never signed in" should answer 401 themselves so the
 * client's refresh interceptor gets a chance to retry.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
  } catch {
    // Deliberately swallowed — see above.
  }

  next();
}
