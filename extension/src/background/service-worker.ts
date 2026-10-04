// Background service worker for Memora Chrome Extension V1
import { ACCESS_TOKEN_COOKIE, SERVER_ORIGIN, TOKEN_STORAGE_KEY } from "../lib/config";
import { apiFetch, ApiError } from "../lib/api";

// Only the background worker holds the "cookies" permission — it mirrors the
// httpOnly access-token cookie into chrome.storage.local, which is what the
// popup and this file's own saveMemory() actually read (see api.ts). This
// replaces a prior, broken attempt in content-script.ts to read the cookie
// via page-context localStorage, which can never see an httpOnly cookie.
function syncAuthToken(done: () => void = () => {}): void {
  chrome.cookies.get({ url: SERVER_ORIGIN, name: ACCESS_TOKEN_COOKIE }, (cookie) => {
    chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: cookie?.value ?? null }, done);
  });
}

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.name === ACCESS_TOKEN_COOKIE) {
    syncAuthToken();
  }
});

// The popup asks for a fresh sync on open, in case the cookie was set (login)
// or cleared (logout) since the last onChanged event, e.g. right after the
// extension itself was installed. Must return true + call sendResponse
// asynchronously (inside the cookies.get callback), or the message channel
// closes before the storage write actually lands.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "SYNC_AUTH") {
    syncAuthToken(() => sendResponse({ ok: true }));
    return true;
  }
  return undefined;
});

chrome.runtime.onStartup.addListener(syncAuthToken);

// Clipboard monitoring for quick URL saves (MV3 paste detection via content script coordination)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CLIPBOARD_URL_DETECTED") {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        sendResponse({ ok: false });
        return;
      }

      try {
        // Save the URL from clipboard
        const urlStr = request.url;
        const urlObj = new URL(urlStr);
        await createMemory({
          type: "web",
          url: urlStr,
          title: urlObj.hostname || urlStr,
          description: "Captured from clipboard",
        });
        sendResponse({ ok: true, message: "URL saved from clipboard" });
      } catch (err) {
        notifySaveError(err);
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Failed to save" });
      }
    })();
    return true;
  }
  return undefined;
});

chrome.runtime.onInstalled.addListener(() => {
  syncAuthToken();

  // Root menu for Memora actions
  chrome.contextMenus.create({
    id: "memora-root",
    title: "Save to Memora",
    contexts: ["page", "selection", "image", "link"]
  });

  // Save page option
  chrome.contextMenus.create({
    id: "save-page",
    parentId: "memora-root",
    title: "Save this page",
    contexts: ["page"]
  });

  // Save selected text
  chrome.contextMenus.create({
    id: "save-selection",
    parentId: "memora-root",
    title: "Save selected text",
    contexts: ["selection"]
  });

  // Save link (new feature)
  chrome.contextMenus.create({
    id: "save-link",
    parentId: "memora-root",
    title: "Save link",
    contexts: ["link"]
  });

  // Save image
  chrome.contextMenus.create({
    id: "save-image",
    parentId: "memora-root",
    title: "Save image",
    contexts: ["image"]
  });

  // Capture screenshot submenu
  chrome.contextMenus.create({
    id: "capture-submenu",
    parentId: "memora-root",
    title: "Capture screenshot",
    contexts: ["page", "selection"]
  });

  // Capture region option
  chrome.contextMenus.create({
    id: "capture-region",
    parentId: "capture-submenu",
    title: "Select region",
    contexts: ["page"]
  });

  // Capture full page option
  chrome.contextMenus.create({
    id: "capture-full-page",
    parentId: "capture-submenu",
    title: "Full page",
    contexts: ["page"]
  });

  console.log("Memora Extension context menus initialized.");
});

// Reads the real session token synced into storage by the popup/content script,
// instead of ever hardcoding it — background saves must use the same auth as the rest of the extension.
function getStoredToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_STORAGE_KEY], (result) => {
      resolve(result[TOKEN_STORAGE_KEY] || null);
    });
  });
}

// Context Menus Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const token = await getStoredToken();
  if (!token) {
    notifySignInRequired();
    return;
  }

  try {
    if (info.menuItemId === "save-page" && tab?.url) {
      await createMemory({ type: "web", url: tab.url, title: tab.title || "Saved Page" });
    } else if (info.menuItemId === "save-selection" && info.selectionText && tab?.url) {
      await createMemory({
        type: "note",
        url: tab.url,
        title: `Quote from ${tab.title || "Webpage"}`,
        content: info.selectionText,
      });
    } else if (info.menuItemId === "save-link" && info.linkUrl && tab?.url) {
      // New: save link destination as a web memory
      const linkTitle = new URL(info.linkUrl).hostname || "Saved Link";
      await createMemory({
        type: "web",
        url: info.linkUrl,
        title: linkTitle,
        description: `Saved from: ${tab.title || "Webpage"}`,
      });
    } else if (info.menuItemId === "save-image" && info.srcUrl && tab?.url) {
      await createMemory({
        type: "image",
        url: tab.url,
        title: `Saved image from ${tab.title || "Webpage"}`,
        attachments: [{ fileUrl: info.srcUrl }],
      });
    } else if (info.menuItemId === "capture-region" && tab?.id && tab?.url) {
      // New: context menu trigger for screenshot region selection
      dispatchCaptureToActiveTab(
        "START_SELECTION",
        tab.id,
        tab.url,
        {},
        () => {}
      );
    } else if (info.menuItemId === "capture-full-page" && tab?.id && tab?.url) {
      // New: context menu trigger for full-page screenshot
      dispatchCaptureToActiveTab(
        "CAPTURE_FULL_PAGE",
        tab.id,
        tab.url,
        {},
        () => {}
      );
    }
  } catch (err) {
    notifySaveError(err);
  }
});

// Keyboard Commands listener
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-save-page") return;

  const token = await getStoredToken();
  if (!token) {
    notifySignInRequired();
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.url) return;
    try {
      await createMemory({ type: "web", url: activeTab.url, title: activeTab.title || "Quick Saved Page" });
    } catch (err) {
      notifySaveError(err);
    }
  });
});

// --- Screenshot capture --------------------------------------------------
//
// The popup's "Take Screenshot" button asks this file to start a region
// selection on the active tab (content-script.ts owns the drag-to-select
// overlay, since it needs the page's DOM); once the user finishes
// dragging, the content script sends back the picked rect plus whatever
// text it read out of that region, and this file does the actual pixel
// capture (chrome.tabs.captureVisibleTab isn't available to content
// scripts), crops it to just the selected area, uploads it, and creates
// the memory — same real save path as everything else in this file.

interface ScreenshotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Pages content scripts can never run on, regardless of manifest
// permissions — captureVisibleTab and tabs.sendMessage both fail here.
// file:// is deliberately excluded: it CAN work, but only if the user has
// flipped "Allow access to file URLs" for this extension, which we can't
// detect in advance — better to let that one fail with the real error.
const RESTRICTED_URL_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "devtools://",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
];

function isRestrictedPage(url: string | undefined): boolean {
  return !url || RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Forwards a capture request to a tab's content script, whichever kind it
 * is (drag-select region or full-page) — both need the same "does this
 * page even support it" check and the same lastError handling.
 *
 * Prefers the tabId/tabUrl the popup already resolved via its own
 * chrome.tabs.query (in loadPageInfo) over re-querying "the active tab"
 * here — by the time this runs, the popup that made this call has already
 * closed, and re-deriving "active tab" from the background at that point
 * is a real race (e.g. it can resolve to whatever window last had focus,
 * which might not be the tab the user actually meant if something else —
 * a DevTools window, another app — grabbed focus in between). Only falls
 * back to a fresh query if the caller genuinely didn't have one.
 */
function dispatchCaptureToActiveTab(
  contentScriptAction: string,
  knownTabId: number | undefined,
  knownTabUrl: string | undefined,
  extra: { note?: string; tags?: string[]; collectionIds?: string[] },
  sendResponse: (response: { ok: boolean }) => void,
): void {
  const proceed = (tabId: number, tabUrl: string | undefined) => {
    if (isRestrictedPage(tabUrl)) {
      console.log("Memora: target tab is a restricted page", tabUrl);
      notifyCannotCapture();
      sendResponse({ ok: false });
      return;
    }
    console.log(`Memora: forwarding ${contentScriptAction} to tab ${tabId} (${tabUrl})`);
    // No callback here previously meant a failure (most commonly: this
    // tab was open before the extension was installed/reloaded, so it
    // never got the content script) failed completely silently — the
    // button would just do nothing with no indication why. Checking
    // chrome.runtime.lastError is what surfaces that as a real message.
    chrome.tabs.sendMessage(tabId, { action: contentScriptAction, ...extra }, () => {
      if (chrome.runtime.lastError) {
        console.error("Memora: content script didn't respond —", chrome.runtime.lastError.message);
        notifyCannotCapture();
      }
      sendResponse({ ok: true });
    });
  };

  if (knownTabId != null) {
    proceed(knownTabId, knownTabUrl);
    return;
  }

  console.log("Memora: no tabId passed in, falling back to querying the active tab");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      console.log("Memora: fallback query found no active tab");
      notifyCannotCapture();
      sendResponse({ ok: false });
      return;
    }
    proceed(tab.id, tab.url);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_SCREENSHOT_SELECTION") {
    dispatchCaptureToActiveTab(
      "START_SELECTION",
      request.tabId,
      request.tabUrl,
      { note: request.note, tags: request.tags, collectionIds: request.collectionIds },
      sendResponse,
    );
    return true;
  }

  if (request.action === "CAPTURE_FULL_PAGE_SCREENSHOT") {
    console.log("Memora: CAPTURE_FULL_PAGE_SCREENSHOT received from popup", request.tabId, request.tabUrl);
    dispatchCaptureToActiveTab(
      "CAPTURE_FULL_PAGE",
      request.tabId,
      request.tabUrl,
      { note: request.note, tags: request.tags, collectionIds: request.collectionIds },
      sendResponse,
    );
    return true;
  }

  if (request.action === "SCREENSHOT_REGION_SELECTED" && sender.tab?.windowId != null) {
    // Handles both a dragged region and a full-viewport capture — the
    // content script sends the exact same message shape for "Full Shot"
    // (rect = the whole viewport instead of one the user drew), so there's
    // one save pipeline for both instead of two.
    //
    // Holding the message channel open (return true + an eventual
    // sendResponse) isn't just etiquette — it's what stops Chrome from
    // suspending this service worker mid-upload. Without it, nothing told
    // the browser this multi-second chain (tab capture -> crop -> upload
    // -> create memory) was still working, so a suspend here could
    // silently kill a screenshot save partway through, and/or leave the
    // worker in a state where the next message (e.g. the popup's own
    // SYNC_AUTH on open) is slow to get a response.
    handleScreenshotRegion(request, sender.tab.windowId)
      .catch(notifySaveError)
      .finally(() => sendResponse({ ok: true }));
    return true;
  }

  // The floating on-page button's "Save this page" action — same real
  // save path as everything else, just triggered from the page itself
  // instead of the popup, and with no note/tags/collections form behind
  // it (that's what the popup is still for).
  if (request.action === "QUICK_SAVE_PAGE") {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        notifySignInRequired();
        return;
      }
      try {
        await createMemory({
          type: "web",
          url: request.url,
          title: (request.title || "Untitled Webpage").slice(0, 500),
          description: request.description || undefined,
        });
      } catch (err) {
        notifySaveError(err);
      }
    })();
    return undefined;
  }

  return undefined;
});

/** Always logs to this worker's own console in addition to trying a desktop notification — if notifications are blocked at the OS/browser level (or anything else about chrome.notifications.create fails), the console is what's still guaranteed to show something. Check via chrome://extensions -> Memora Capture -> "service worker". */
function notify(title: string, message: string): void {
  console.log(`Memora: ${title} — ${message}`);
  chrome.notifications?.create(
    { type: "basic", iconUrl: "icon-128.png", title, message, priority: 1 },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Memora: notification failed to display —", chrome.runtime.lastError.message);
      }
    },
  );
}

function notifyCannotCapture(): void {
  notify(
    "Can't capture this page",
    "This page doesn't support screenshot capture — that's usually a browser system page (chrome://, the Web Store, PDF viewer), or a tab that was already open before Memora was installed or updated. Reloading the tab fixes the latter.",
  );
}

async function handleScreenshotRegion(
  msg: {
    rect: ScreenshotRect;
    dpr: number;
    extractedText: string;
    pageTitle: string;
    pageUrl: string;
    note?: string;
    tags?: string[];
    collectionIds?: string[];
  },
  windowId: number,
): Promise<void> {
  const token = await getStoredToken();
  if (!token) {
    notifySignInRequired();
    return;
  }

  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const blob = await cropToRect(dataUrl, msg.rect, msg.dpr);
  const uploaded = await uploadScreenshot(blob);

  await createMemory({
    type: "image",
    url: msg.pageUrl,
    title: (msg.pageTitle || "Screenshot").slice(0, 500),
    // The user's own note stays exactly what they typed, nothing appended
    // to it — the region's extracted DOM text goes in `description`
    // instead, a separate field for page context rather than something
    // that looks like part of the user's own words.
    content: msg.note?.trim() || undefined,
    description: msg.extractedText || undefined,
    tags: msg.tags && msg.tags.length > 0 ? msg.tags : undefined,
    collectionIds: msg.collectionIds && msg.collectionIds.length > 0 ? msg.collectionIds : undefined,
    attachments: [{ fileUrl: uploaded.fileUrl, fileSize: uploaded.fileSize, mimeType: uploaded.mimeType }],
  });
}

/** Crops the full-viewport capture down to just the selected rect. `dpr` converts the content script's CSS-pixel rect into the device pixels captureVisibleTab actually returns. Service workers have no <canvas>/<img> DOM elements, hence OffscreenCanvas + createImageBitmap. */
async function cropToRect(dataUrl: string, rect: ScreenshotRect, dpr: number): Promise<Blob> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());

  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.min(Math.round(rect.width * dpr), bitmap.width - sx);
  const sh = Math.min(Math.round(rect.height * dpr), bitmap.height - sy);
  if (sw <= 0 || sh <= 0) {
    throw new Error("Screenshot capture came back empty — try again.");
  }

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't render the screenshot crop.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvas.convertToBlob({ type: "image/png" });
}

async function uploadScreenshot(blob: Blob): Promise<{ fileUrl: string; mimeType: string; fileSize: number }> {
  const presigned = await apiFetch<{ uploadUrl: string; fileUrl: string; key: string }>("/uploads/presign", {
    method: "POST",
    body: JSON.stringify({ filename: `screenshot-${Date.now()}.png`, mimeType: "image/png", fileSize: blob.size }),
  });

  const putResponse = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: blob,
  });
  if (!putResponse.ok) throw new Error("Uploading the screenshot to storage failed.");

  return { fileUrl: presigned.fileUrl, mimeType: "image/png", fileSize: blob.size };
}

// --- Shared save path ------------------------------------------------------

interface MemoryCreatePayload {
  type: "web" | "note" | "image";
  url?: string;
  title: string;
  content?: string;
  description?: string;
  tags?: string[];
  collectionIds?: string[];
  attachments?: { fileUrl: string; fileSize?: number; mimeType?: string }[];
}

async function createMemory(payload: MemoryCreatePayload): Promise<void> {
  const memory = await apiFetch<{ id: string; title: string }>("/memories", {
    method: "POST",
    body: JSON.stringify({ ...payload, captureMethod: "extension" }),
  });

  notify("Saved to Memora", memory.title || payload.title);
}

function notifySignInRequired(): void {
  notify("Sign in to Memora", "Open the Memora extension popup and sign in before saving.");
}

function notifySaveError(err: unknown): void {
  const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong.";
  notify("Couldn't save to Memora", message);
}
