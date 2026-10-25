import type { NextFunction, Request, Response } from "express";
import { extractToken } from "./authenticate";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Sets `req.user` when signed in and does nothing otherwise, for routes serving both audiences (a shared link is readable by anonymous visitors, its owner and grantees); `authenticate` can't, it 401s first.
 * An invalid or expired token counts as anonymous so a stale cookie doesn't break a public page. Handlers that must tell "expired" from "never signed in" answer 401 themselves so the client's refresh interceptor can retry.
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
