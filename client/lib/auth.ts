import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type OAuthProvider = "google" | "github";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  roles: string[];
  onboardingCompleted: boolean;
}

/**
 * Thrown by apiFetch/apiFetchRaw. `status` is 0 for a request that never got
 * a response at all (server unreachable — e.g. mid dev-server-restart), so
 * callers can tell "genuinely unauthorized" (status 401) apart from a
 * transient network hiccup instead of treating both the same way.
 */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { message: string; code?: string };
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * Axios instance for the Savedly API. `withCredentials` rides the httpOnly
 * auth cookies along with every request — the backend owns the
 * access/refresh tokens entirely, this client never reads or stores them.
 */
// Exported for the rare caller that needs to bypass the {success,data,meta,
// error} envelope entirely — e.g. a file download (see lib/data-export.ts),
// which isn't JSON at all. Everything else should go through apiFetch below.
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Access tokens are short-lived (15m) while the refresh token cookie lives
// for 7d, so a 401 partway through a session doesn't mean the user is
// actually logged out — it means the access token needs rotating. Shared
// across callers so concurrent 401s (several in-flight requests expiring at
// once) trigger a single refresh instead of racing the single-use rotating
// refresh token against itself (a second call would reuse an
// already-revoked token and fail for real).
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post("/auth/refresh")
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(undefined, async (error: AxiosError<Partial<ApiEnvelope<unknown>>>) => {
  // No `response` at all means the request never completed (server
  // unreachable, dropped connection) rather than a genuine API error.
  if (!error.response) {
    throw new ApiError("Couldn't reach the server. Please check your connection.", 0);
  }

  const config = error.config as RetryableConfig | undefined;
  const path = config?.url ?? "";

  if (error.response.status === 401 && config && !config._retried && path !== "/auth/refresh" && path !== "/auth/logout") {
    config._retried = true;
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api(config);
    }
  }

  throw new ApiError(
    error.response.data?.error?.message ?? "Something went wrong. Please try again.",
    error.response.status,
    error.response.data?.error?.code,
  );
});

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Calls the Savedly API and unwraps the {success,data,meta,error} envelope.
 */
export async function apiFetchRaw<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const response = await api.request<ApiEnvelope<T>>({
    url: path,
    method: options.method ?? "GET",
    data: options.body,
    headers: options.headers,
  });

  // A 204 (or otherwise bodyless) response has nothing to unwrap.
  if (response.status === 204 || !response.data) {
    return { data: undefined as T, meta: {} };
  }

  const body = response.data;
  if (!body.success) {
    throw new ApiError(body.error?.message ?? "Something went wrong. Please try again.", response.status, body.error?.code);
  }

  return { data: body.data, meta: body.meta ?? {} };
}

/** Same as {@link apiFetchRaw}, but discards `meta` for callers that only need the payload. */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { data } = await apiFetchRaw<T>(path, options);
  return data;
}

/**
 * Full-page redirect to the backend, which handles the entire OAuth round
 * trip and redirects back with cookies set.
 */
export function getProviderLoginUrl(provider: OAuthProvider): string {
  return `${API_URL}/auth/${provider}`;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/auth/me");
  return user;
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // best-effort — the cookies are httpOnly, so there's nothing local left to clear on failure
  }
}

/** Which sign-in methods this server offers — see server auth.controller.ts's providers(). */
export interface AuthProviders {
  google: boolean;
  github: boolean;
  password: boolean;
  signupsEnabled: boolean;
  /** A fresh self-hosted install with no accounts yet: the first sign-up becomes admin. */
  needsSetup: boolean;
}

export function getAuthProviders(): Promise<AuthProviders> {
  return apiFetch<AuthProviders>("/auth/providers");
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/auth/login", { method: "POST", body: { email, password } });
  return user;
}

export async function registerWithPassword(name: string, email: string, password: string): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  return user;
}
