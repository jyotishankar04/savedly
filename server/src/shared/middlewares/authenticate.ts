import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookies";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Bearer header first, cookie second. Exported so optional-authenticate.ts
 * shares this precedence rather than reimplementing it — the extension sends
 * a Bearer header while the web client relies on the cookie, and the two
 * middlewares drifting apart would authenticate different callers.
 */
export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError("Not authenticated", 401, "UNAUTHORIZED"));
  }

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
  next();
}
