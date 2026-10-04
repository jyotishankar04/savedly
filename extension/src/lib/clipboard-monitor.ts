/**
 * Clipboard monitor utility — detects when URLs are copied to clipboard
 * and offers quick-save via service worker messaging (MV3 compatible).
 *
 * Note: Detecting paste events via content script is MV3-compliant;
 * direct clipboard.readText() requires "clipboardRead" permission which
 * MV3 restricts to user gestures only (paste/Ctrl+V).
 */

const URL_PATTERN = /^https?:\/\/[^\s]+$/;
const DEBOUNCE_MS = 500;

let lastSavedUrl = "";
let debounceTimer: number | null = null;

export function initClipboardMonitor(): void {
  if (typeof chrome === "undefined" || !chrome.runtime) return; // Only run in content scripts

  // Detect paste events (MV3-compliant, no extra permissions needed)
  document.addEventListener(
    "paste",
    (event) => {
      const text = event.clipboardData?.getData("text")?.trim();
      if (!text) return;

      // Check if it looks like a URL
      if (URL_PATTERN.test(text) && text !== lastSavedUrl) {
        lastSavedUrl = text;

        // Debounce rapid pastes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          sendClipboardUrlToBackground(text);
        }, DEBOUNCE_MS);
      }
    },
    true
  );
}

/**
 * Send detected URL to the background worker for quick-save decision.
 * The user must choose — we just detect and notify.
 */
function sendClipboardUrlToBackground(url: string): void {
  chrome.runtime.sendMessage(
    { action: "CLIPBOARD_URL_DETECTED", url },
    (response) => {
      if (!response) return;
      if (response.ok) {
        console.log("Memora: Saved URL from clipboard");
      } else {
        console.log("Memora: Could not save clipboard URL:", response.error);
      }
    }
  );
}
