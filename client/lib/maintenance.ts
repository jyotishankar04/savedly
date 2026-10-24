import { apiFetch } from "@/lib/auth";

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
}

/**
 * Maintenance switched on in the website itself, for when the backend is down
 * and can't say so (Admin's maintenance switch lives on the backend). Set
 * NEXT_PUBLIC_MAINTENANCE_MODE=true, and optionally
 * NEXT_PUBLIC_MAINTENANCE_MESSAGE, then rebuild: the app, sign-in, onboarding
 * and admin show the maintenance page, and the public pages show the
 * maintenance notice once a visit, all without asking the API.
 */
export const FORCED_MAINTENANCE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
export const FORCED_MAINTENANCE_MESSAGE =
  process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE || "We're doing some maintenance. Your saves are safe, and Savedly will be back shortly.";

/** Public, unauthenticated — every surface (marketing, platform, auth) polls this to decide whether to gate itself. */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  if (FORCED_MAINTENANCE) return { enabled: true, message: FORCED_MAINTENANCE_MESSAGE };
  return apiFetch<MaintenanceStatus>("/maintenance/status");
}
