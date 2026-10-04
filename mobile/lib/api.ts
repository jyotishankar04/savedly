import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const ACCESS_TOKEN_KEY = "memora_access_token";
export const REFRESH_TOKEN_KEY = "memora_refresh_token";

/**
 * Thrown by apiFetch/apiFetchRaw. `status` is 0 for a request that never got
 * a response at all (server unreachable), same convention as the web
 * client's ApiError (client/lib/auth.ts), so callers can tell a genuine
 * 401 apart from a transient network hiccup.
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
 * No cookie jar on native the way a browser has one — every request carries
 * its own Authorization header, read fresh from expo-secure-store (the
 * encrypted keychain/keystore, not AsyncStorage) on each call.
 */
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// Same dedup rationale as the web client (client/lib/auth.ts) — concurrent
// 401s from several in-flight requests trigger one refresh, not a race
// against the single-use rotating refresh token. Exported so callers that
// can't go through the axios instance above (e.g. the AI chat stream, which
// needs a raw fetch-compatible function for expo/fetch's streaming body)
// can still get the same refresh-and-retry behavior.
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        const response = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
          `${API_URL}/auth/refresh`,
          { refreshToken },
        );
        if (!response.data.success) return false;

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.data.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

api.interceptors.response.use(undefined, async (error: AxiosError<Partial<ApiEnvelope<unknown>>>) => {
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
    // Refresh itself failed — the stored tokens are no good, clear them so
    // the app routes back to the login screen instead of retrying forever.
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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

/** Calls the SaveForLatter API and unwraps the {success,data,meta,error} envelope. */
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

export { API_URL };
