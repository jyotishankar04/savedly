import { apiFetch } from "./api";

// Which pages are already saved, without telling the server what you browse.
//
// The server hands over short hashes of every saved page's address
// (GET /memories/url-keys); the extension hashes the page you're on the
// same way and compares, here in the browser. The addresses you visit never
// leave it. Only opening the popup on a page asks the server about that page.

const STORAGE_KEY = "savedly_saved_url_keys";
// Saves made elsewhere (the app, the phone) show up within this long.
const MAX_AGE_MS = 10 * 60 * 1000;

const TRACKING_PARAM_PATTERNS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^igshid$/i, /^mc_[a-z]+$/i, /^ref$/i, /^ref_src$/i];

/** The server's normalizeUrl (server/src/modules/memory/normalize-url.ts), line for line: the two must agree for a match. */
export function normalizeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  const keptParams = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(key)));
  url.search = "";
  for (const [key, value] of keptParams.sort(([a], [b]) => a.localeCompare(b))) url.searchParams.append(key, value);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.hostname}${pathname}${url.search}`;
}

/** The first 16 hex characters of SHA-256 over the normalized URL, as the server computes it. */
export async function urlKey(rawUrl: string): Promise<string | null> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

interface Stored {
  keys: string[];
  at: number;
}

let memo: { keys: Set<string>; at: number } | null = null;
let loading: Promise<Set<string>> | null = null;

async function readStored(): Promise<Stored | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Stored | undefined) ?? null;
}

async function store(keys: Set<string>): Promise<void> {
  memo = { keys, at: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY]: { keys: [...keys], at: memo.at } satisfies Stored });
}

/** The saved pages' hashes: from memory, then storage, then the server once they're older than MAX_AGE_MS. */
export async function savedKeys(force = false): Promise<Set<string>> {
  if (!force && memo && Date.now() - memo.at < MAX_AGE_MS) return memo.keys;
  if (!force && !memo) {
    const stored = await readStored();
    if (stored && Date.now() - stored.at < MAX_AGE_MS) {
      memo = { keys: new Set(stored.keys), at: stored.at };
      return memo.keys;
    }
  }
  loading ??= apiFetch<{ keys: string[] }>("/memories/url-keys")
    .then(async ({ keys }) => {
      const set = new Set(keys);
      await store(set);
      return set;
    })
    // Offline or signed out: whatever was known stands.
    .catch(() => memo?.keys ?? new Set<string>())
    .finally(() => {
      loading = null;
    });
  return loading;
}

export async function isSaved(rawUrl: string): Promise<boolean> {
  const key = await urlKey(rawUrl);
  return !!key && (await savedKeys()).has(key);
}

/** Right after a save: the page counts as saved at once, without waiting for the next refresh. */
export async function rememberSaved(rawUrl: string): Promise<void> {
  const key = await urlKey(rawUrl);
  if (!key) return;
  const keys = new Set(await savedKeys());
  keys.add(key);
  await store(keys);
}

/** On sign-out: nothing of the last account's library is kept. */
export async function forgetSaved(): Promise<void> {
  memo = null;
  highlightedMemo = null;
  await chrome.storage.local.remove([STORAGE_KEY, HIGHLIGHTED_STORAGE_KEY]);
}

// --- Pages with highlights ----------------------------------------------------
// The same idea for highlights: the hashes of pages that have some, so a page's
// highlights are fetched only when there are any to show.

const HIGHLIGHTED_STORAGE_KEY = "savedly_highlighted_url_keys";
let highlightedMemo: { keys: Set<string>; at: number } | null = null;
let highlightedLoading: Promise<Set<string>> | null = null;

async function highlightedKeys(force = false): Promise<Set<string>> {
  if (!force && highlightedMemo && Date.now() - highlightedMemo.at < MAX_AGE_MS) return highlightedMemo.keys;
  if (!force && !highlightedMemo) {
    const stored = (await chrome.storage.local.get(HIGHLIGHTED_STORAGE_KEY))[HIGHLIGHTED_STORAGE_KEY] as Stored | undefined;
    if (stored && Date.now() - stored.at < MAX_AGE_MS) {
      highlightedMemo = { keys: new Set(stored.keys), at: stored.at };
      return highlightedMemo.keys;
    }
  }
  highlightedLoading ??= apiFetch<{ keys: string[] }>("/highlights/url-keys")
    .then(async ({ keys }) => {
      const set = new Set(keys);
      highlightedMemo = { keys: set, at: Date.now() };
      await chrome.storage.local.set({ [HIGHLIGHTED_STORAGE_KEY]: { keys, at: highlightedMemo.at } satisfies Stored });
      return set;
    })
    .catch(() => highlightedMemo?.keys ?? new Set<string>())
    .finally(() => {
      highlightedLoading = null;
    });
  return highlightedLoading;
}

export async function hasHighlights(rawUrl: string): Promise<boolean> {
  const key = await urlKey(rawUrl);
  return !!key && (await highlightedKeys()).has(key);
}

/** After highlighting a page: it counts at once, and the next refresh confirms it. */
export async function rememberHighlighted(rawUrl: string): Promise<void> {
  const key = await urlKey(rawUrl);
  if (!key) return;
  const keys = new Set(await highlightedKeys());
  keys.add(key);
  highlightedMemo = { keys, at: Date.now() };
  await chrome.storage.local.set({ [HIGHLIGHTED_STORAGE_KEY]: { keys: [...keys], at: highlightedMemo.at } satisfies Stored });
}

/** Forces the next check to ask the server (e.g. after the last highlight on a page is deleted). */
export function refreshHighlighted(): void {
  highlightedMemo = null;
  void chrome.storage.local.remove(HIGHLIGHTED_STORAGE_KEY);
}
