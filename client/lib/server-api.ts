// Server components can't use a relative URL, so a self-hosted build (where
// NEXT_PUBLIC_API_URL is "/api/v1") reaches the API container directly.
const API_URL = process.env.API_INTERNAL_URL
  ? `${process.env.API_INTERNAL_URL.replace(/\/$/, "")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1");

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string } | null;
}

export type ServerApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string };

/**
 * Server-component counterpart to lib/auth.ts's `apiFetch`.
 *
 * Three deliberate differences:
 *  - plain fetch, not the axios instance: that one carries
 *    `withCredentials` and a 401 refresh interceptor, both of which are
 *    browser concepts and neither of which works from the server.
 *  - errors are RETURNED, not thrown, so a page can branch on the error
 *    code (a gated share is an expected outcome here, not a failure).
 *  - always anonymous. Nothing personalized is ever rendered server-side:
 *    the API is a different origin from Next, so forwarding the session
 *    cookie only works when both happen to share a cookie domain — true on
 *    localhost, false in most real deployments. Building on that would
 *    produce a bug that only appears in production.
 */
export async function serverApiFetch<T>(path: string): Promise<ServerApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      // Share settings change without any deploy or revalidation hook, and
      // serving a stale "this is public" would be a privacy bug, not just
      // a staleness one.
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR" };
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    return { ok: false, status: response.status, code: body?.error?.code ?? "UNKNOWN" };
  }

  return { ok: true, data: body.data };
}
