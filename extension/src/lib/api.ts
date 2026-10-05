import { API_BASE, TOKEN_STORAGE_KEY } from "./config";

/** Mirrors client/lib/auth.ts's ApiError shape for consistent error handling. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_STORAGE_KEY], (result) => resolve(result[TOKEN_STORAGE_KEY] ?? null));
  });
}

/**
 * Calls the SaveForLatter API with the token the background worker mirrored from
 * the httpOnly auth cookie (see background/service-worker.ts), and unwraps
 * the {success,data,meta,error} envelope — same contract client/lib/auth.ts
 * uses.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Not signed in to SaveForLatter", 401, "UNAUTHORIZED");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Couldn't reach the SaveForLatter server.", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? "Something went wrong.", response.status, body?.error?.code);
  }

  return body.data as T;
}
