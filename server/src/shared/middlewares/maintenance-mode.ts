import type { NextFunction, Request, Response } from "express";
import { isMaintenanceMode, getMaintenanceMessage } from "../../modules/feature-flags/feature-flags.service";
import { ApiResponse } from "../response/api-response";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookies";
import { verifyAccessToken } from "../utils/jwt";

// /announcements and /maintenance are public, read-only, and consumed by the
// marketing site itself — which stays fully usable during maintenance.
// /billing/webhook must stay reachable too — Stripe's retries don't know or
// care that maintenance mode is on, and blocking them just delays a plan
// assignment that already succeeded on Stripe's side.
const BYPASS_PATH_PREFIXES = ["/health", "/config", "/admin", "/auth", "/announcements", "/whats-new", "/maintenance", "/billing/webhook"];

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
 * Mounted early in routes/index.ts, before the per-module route mounts.
 * When maintenance mode is on, blocks everything except health/admin/auth
 * routes and requests already carrying an admin token — so an admin can
 * still log in and turn it back off.
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
