import { API_BASE, SIGNED_IN_STORAGE_KEY } from "./config";

/** Mirrors client/lib/auth.ts's ApiError shape for consistent error handling. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

// How the extension is signed in
//
// It uses the same sign-in as the web app: the httpOnly cookies the Savedly
// server set in this browser. Requests go out with `credentials: "include"`,
// so the browser attaches them. The extension never reads, copies or stores
// a token, and needs no "cookies" permission.
//
// The access cookie lasts minutes and the refresh cookie days, so a 401
// usually means "renew", not "signed out": renew once and try again. Only a
// 401 after that means the person has to sign in on the website.

let lastKnownSignedIn: boolean | null = null;

/** Records whether the browser is signed in, for the popup and the on-page button to read. */
export function setSignedIn(signedIn: boolean): void {
  if (lastKnownSignedIn === signedIn) return;
  lastKnownSignedIn = signedIn;
  chrome.storage.local.set({ [SIGNED_IN_STORAGE_KEY]: signedIn });
}

// One renewal at a time: the refresh token is single-use, so two renewals
// started together would have the second one rejected.
let renewing: Promise<void> | null = null;

function renewSession(): Promise<void> {
  if (!renewing) {
    renewing = fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(() => undefined)
      // A failure here isn't final. The web app, or the popup, may have
      // renewed a moment earlier and used up the token; the browser then
      // already holds the new cookies, and the retry below succeeds.
      .catch(() => undefined)
      .finally(() => {
        renewing = null;
      });
  }
  return renewing;
}

function send(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

/**
 * Calls the Savedly API as the person signed in to Savedly in this browser,
 * and unwraps the {success,data,meta,error} envelope — same contract
 * client/lib/auth.ts uses.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await send(path, options);
    if (response.status === 401) {
      await renewSession();
      response = await send(path, options);
    }
  } catch {
    throw new ApiError("Couldn't reach the Savedly server.", 0);
  }

  if (response.status === 401) {
    setSignedIn(false);
    throw new ApiError("Not signed in to Savedly", 401, "UNAUTHORIZED");
  }
  setSignedIn(true);

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? "Something went wrong.", response.status, body?.error?.code);
  }

  return body.data as T;
}

/**
 * Asks the server whether this browser is signed in, and records the answer.
 * If the server can't be reached, the last known answer stands.
 */
export async function checkSignedIn(): Promise<boolean> {
  try {
    await apiFetch("/auth/me");
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return false;
    return new Promise((resolve) => {
      chrome.storage.local.get([SIGNED_IN_STORAGE_KEY], (result) => resolve(!!result[SIGNED_IN_STORAGE_KEY]));
    });
  }
}
