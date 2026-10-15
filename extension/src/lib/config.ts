// Which Savedly this build talks to.
// Reads from Vite env variables (VITE_SERVER_ORIGIN, VITE_WEB_APP_URL),
// defaulting to localhost values for development.
export const SERVER_ORIGIN = (
  import.meta.env.VITE_SERVER_ORIGIN ||
  (typeof __API_ORIGIN__ !== "undefined" ? __API_ORIGIN__ : "http://localhost:4000")
).replace(/\/+$/, "");
export const API_BASE = `${SERVER_ORIGIN}/api/v1`;
export const WEB_APP_URL = (
  import.meta.env.VITE_WEB_APP_URL ||
  (typeof __WEB_APP_URL__ !== "undefined" ? __WEB_APP_URL__ : "http://localhost:3000")
).replace(/\/+$/, "");

// chrome.storage.local key: true while the browser is signed in to Savedly.
// Only this yes/no is kept. The sign-in itself stays in the browser's own
// cookies for the Savedly server, which the extension never reads or copies
// (see api.ts).
export const SIGNED_IN_STORAGE_KEY = "savedly_signed_in";

// chrome.storage.local key for the floating on-page quick-actions button —
// local only for now (extension-only scope; syncing this from the web
// app's own settings page is a separate follow-up). Defaults to shown
// (see content-script.ts) when unset, so a fresh install doesn't need an
// explicit opt-in to see it.
export const SHOW_FLOATING_ICON_STORAGE_KEY = "savedly_show_floating_icon";
