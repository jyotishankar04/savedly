import type { NextFunction, Request, Response } from "express";
import { isMaintenanceMode, getMaintenanceMessage } from "./feature-flags.service";
import { ApiResponse } from "../../shared/response/api-response";
import { ACCESS_TOKEN_COOKIE } from "../../shared/utils/cookies";
import { verifyAccessToken } from "../../shared/utils/jwt";

// /announcements and /maintenance are public read-only data for the marketing site, which stays
// usable. /billing/webhook must stay reachable: provider retries don't know about maintenance mode,
// and blocking them only delays a plan change that already succeeded.
const BYPASS_PATH_PREFIXES = ["/health", "/config", "/admin", "/auth", "/announcements", "/whats-new", "/maintenance", "/billing/webhook", "/email"];

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

/** Soft-decode — an invalid/missing/expired token just means "not an admin", not an error. */
function requestIsFromAdmin(req: Request): boolean {
  const token = extractToken(req);
  if (!token) return false;
  try {
    const payload = verifyAccessToken(token);
    return payload.roles.includes("admin");
  } catch {
    return false;
  }
}

/**
 * Mounted early in routes/index.ts. In maintenance mode it blocks everything except
 * health/admin/auth routes and requests with an admin token, so an admin can log in and turn it
 * off.
 */
export async function maintenanceMode(req: Request, res: Response, next: NextFunction) {
  if (BYPASS_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const enabled = await isMaintenanceMode();
  if (!enabled) {
    return next();
  }

  if (requestIsFromAdmin(req)) {
    return next();
  }

  const message = await getMaintenanceMessage();
  res.status(503).json(ApiResponse.error("MAINTENANCE_MODE", message));
}
