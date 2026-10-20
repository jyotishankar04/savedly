// Background service worker for the Savedly Chrome extension
import { apiFetch, ApiError, checkAuth, checkSignedIn } from "../lib/api";
import { SIGNED_IN_STORAGE_KEY, WEB_APP_URL } from "../lib/config";
import { forgetSaved, hasHighlights, isSaved, refreshHighlighted, rememberHighlighted, rememberSaved, savedKeys } from "../lib/saved-pages";

// Sign-in is the browser's own Savedly session (see lib/api.ts). This file
// only keeps the yes/no "signed in" flag fresh for the popup and the on-page
// button: it asks the server when the browser starts, when the popup opens,
// and when a Savedly page loads (the content script says so, which is how a
// sign-in or sign-out on the website shows up here straight away).
// Must return true and answer asynchronously, or the message channel closes
// before the answer is ready.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "SYNC_AUTH") {
    checkAuth().then(({ signedIn, problem }) => sendResponse({ ok: true, signedIn, problem }));
    return true;
  }
  return undefined;
});

chrome.runtime.onStartup.addListener(() => {
  void checkSignedIn().then(() => refreshSaveToMenu());
  startTicking();
});

chrome.runtime.onInstalled.addListener((details) => {
  // A first install opens the tour of what the extension does (src/welcome); updates don't.
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) openWelcome();
  // Tabs open since before this install or update have no content script (or
  // one cut off from the extension): give them one, so the side panel, the
  // ✓ badge, highlights and the on-page button work there without a reload.
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL || details.reason === chrome.runtime.OnInstalledReason.UPDATE) void reconnectOpenTabs();
  // On the Savedly icon's own right-click menu, to see the tour again.
  chrome.contextMenus.create({ id: "take-the-tour", title: "Take the tour", contexts: ["action"] }, () => void chrome.runtime.lastError);

  // Earlier builds kept a copy of the access token here. Nothing reads it now.
  chrome.storage.local.remove("savedly_token");
  void checkSignedIn();
  startTicking();

  // Root menu for Savedly actions
  chrome.contextMenus.create({
    id: "savedly-root",
    title: "Save to Savedly",
    contexts: ["page", "selection", "image", "link"]
  });

  chrome.contextMenus.create({
    id: "open-side-panel",
    parentId: "savedly-root",
    title: "Open Savedly side panel",
    contexts: ["page", "selection", "image", "link"]
  });

  // Save page option
  chrome.contextMenus.create({
    id: "save-page",
    parentId: "savedly-root",
    title: "Save this page",
    contexts: ["page"]
  });

  // Save selected text
  chrome.contextMenus.create({
    id: "save-selection",
    parentId: "savedly-root",
    title: "Save selected text",
    contexts: ["selection"]
  });

  // Save link (new feature)
  chrome.contextMenus.create({
    id: "save-link",
    parentId: "savedly-root",
    title: "Save link",
    contexts: ["link"]
  });

  // Save image
  chrome.contextMenus.create({
    id: "save-image",
    parentId: "savedly-root",
    title: "Save image",
    contexts: ["image"]
  });

  // Capture screenshot submenu
  chrome.contextMenus.create({
    id: "capture-submenu",
    parentId: "savedly-root",
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

  console.log("Savedly Extension context menus initialized.");
  void refreshSaveToMenu();
});

// Context Menus Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {

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
chrome.commands.onCommand.addListener(async (command, tab) => {
  // Opened straight away: the side panel only opens in direct answer to the person's action.
  if (command === "open-side-panel") {
    if (tab?.windowId != null) void chrome.sidePanel.open({ windowId: tab.windowId });
    return;
  }
  if (command !== "quick-save-page") return;


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
      console.log("Savedly: target tab is a restricted page", tabUrl);
      notifyCannotCapture();
      sendResponse({ ok: false });
      return;
    }
    console.log(`Savedly: forwarding ${contentScriptAction} to tab ${tabId} (${tabUrl})`);
    // No callback here previously meant a failure (most commonly: this
    // tab was open before the extension was installed/reloaded, so it
    // never got the content script) failed completely silently — the
    // button would just do nothing with no indication why. Checking
    // chrome.runtime.lastError is what surfaces that as a real message.
    chrome.tabs.sendMessage(tabId, { action: contentScriptAction, ...extra }, () => {
      if (chrome.runtime.lastError) {
        console.error("Savedly: content script didn't respond —", chrome.runtime.lastError.message);
        notifyCannotCapture();
      }
      sendResponse({ ok: true });
    });
  };

  if (knownTabId != null) {
    proceed(knownTabId, knownTabUrl);
    return;
  }

  console.log("Savedly: no tabId passed in, falling back to querying the active tab");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      console.log("Savedly: fallback query found no active tab");
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
    console.log("Savedly: CAPTURE_FULL_PAGE_SCREENSHOT received from popup", request.tabId, request.tabUrl);
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

/** Always logs to this worker's own console in addition to trying a desktop notification — if notifications are blocked at the OS/browser level (or anything else about chrome.notifications.create fails), the console is what's still guaranteed to show something. Check via chrome://extensions -> Savedly Capture -> "service worker". */
function notify(title: string, message: string): void {
  console.log(`Savedly: ${title} — ${message}`);
  chrome.notifications?.create(
    { type: "basic", iconUrl: "icon-128.png", title, message, priority: 1 },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Savedly: notification failed to display —", chrome.runtime.lastError.message);
      }
    },
  );
}

function notifyCannotCapture(): void {
  notify(
    "Can't capture this page",
    "This page doesn't support screenshot capture — that's usually a browser system page (chrome://, the Web Store, PDF viewer), or a tab that was already open before Savedly was installed or updated. Reloading the tab fixes the latter.",
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
  // Chrome's own pages and extension pages (this tour included) aren't web pages Savedly can open again or read.
  if (payload.type === "web" && payload.url && !/^https?:\/\//.test(payload.url)) {
    notify("This page can't be saved", "Savedly saves web pages. Open one and save it from there.");
    return;
  }
  const memory = await apiFetch<{ id: string; title: string }>("/memories", {
    method: "POST",
    body: JSON.stringify({ ...payload, captureMethod: "extension" }),
  });

  notify("Saved to Savedly", memory.title || payload.title);
  if (payload.url) await rememberSaved(payload.url);
  void refreshSaveToMenu();
}

function notifySignInRequired(): void {
  notify("Sign in to Savedly", "Click the Savedly icon in the toolbar and sign in, then save again.");
}

function notifySaveError(err: unknown): void {
  // Signed out (or the sign-in ran out and couldn't be renewed).
  if (err instanceof ApiError && err.status === 401) {
    notifySignInRequired();
    return;
  }
  const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong.";
  notify("Couldn't save to Savedly", message);
}

// --- Already saved? -------------------------------------------------------
//
// The content script reports each page it runs on (PAGE_SEEN); the check is
// local (lib/saved-pages.ts), and a saved page gets a check mark on the
// toolbar icon. The popup reports its own saves (PAGE_SAVED).

async function signedIn(): Promise<boolean> {
  const result = await chrome.storage.local.get(SIGNED_IN_STORAGE_KEY);
  return !!result[SIGNED_IN_STORAGE_KEY];
}

async function showSavedBadge(tabId: number, url: string): Promise<void> {
  const saved = (await signedIn()) && (await isSaved(url));
  await chrome.action.setBadgeText({ tabId, text: saved ? "✓" : "" });
  if (saved) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#1447E6" });
    await chrome.action.setBadgeTextColor?.({ tabId, color: "#ffffff" });
  }
  await chrome.action.setTitle({ tabId, title: saved ? "Saved to Savedly. Click to see it" : "Save to Savedly" });
}

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "PAGE_SEEN" && sender.tab?.id != null && typeof request.url === "string") {
    void showSavedBadge(sender.tab.id, request.url).catch(() => undefined);
    void sendPageHighlights(sender.tab.id, request.url).catch(() => undefined);
  }
  if (request.action === "PAGE_SAVED" && typeof request.url === "string") {
    void rememberSaved(request.url).then(() => (typeof request.tabId === "number" ? showSavedBadge(request.tabId, request.url) : undefined));
  }
  return undefined;
});

// Signed out on the website: nothing of that library stays in the extension.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SIGNED_IN_STORAGE_KEY]?.newValue === false) void forgetSaved();
});

// --- Reminders --------------------------------------------------------------
//
// Once a minute: any reminder that came due since the last look becomes a
// desktop notification, even with no Savedly tab open. Clicking it opens
// the memory and marks the notification read.

const TICK = "savedly-tick";
const LAST_REMINDER_KEY = "savedly_last_reminder_at";
const REMINDER_LINKS_KEY = "savedly_reminder_links";

function startTicking(): void {
  // Idempotent: an alarm with the same name replaces the old one.
  chrome.alarms.create(TICK, { periodInMinutes: 1 });
}

interface ReminderNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  createdAt: string;
}

async function checkReminders(): Promise<void> {
  if (!(await signedIn())) return;
  const stored = await chrome.storage.local.get([LAST_REMINDER_KEY, REMINDER_LINKS_KEY]);
  const since = stored[LAST_REMINDER_KEY] as string | undefined;
  // First run: start from now, rather than replaying every old reminder.
  if (!since) {
    await chrome.storage.local.set({ [LAST_REMINDER_KEY]: new Date().toISOString() });
    return;
  }
  const unread = await apiFetch<ReminderNotification[]>("/notifications?status=unread&limit=20");
  const due = unread.filter((n) => n.type === "memory_reminder" && n.createdAt > since).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (due.length === 0) return;
  const links = { ...((stored[REMINDER_LINKS_KEY] as Record<string, string> | undefined) ?? {}) };
  for (const n of due) {
    const id = `reminder:${n.id}`;
    links[id] = n.actionUrl ?? "/app/inbox";
    chrome.notifications.create(id, {
      type: "basic",
      iconUrl: "icon-128.png",
      title: n.title,
      message: n.body ?? "You asked to come back to this.",
      priority: 2,
      buttons: [{ title: "Open" }],
    });
  }
  // Only the latest few are worth keeping a link for.
  const recent = Object.fromEntries(Object.entries(links).slice(-30));
  await chrome.storage.local.set({ [LAST_REMINDER_KEY]: due[due.length - 1]!.createdAt, [REMINDER_LINKS_KEY]: recent });
}

async function openReminder(notificationId: string): Promise<void> {
  if (!notificationId.startsWith("reminder:")) return;
  const stored = await chrome.storage.local.get(REMINDER_LINKS_KEY);
  const path = ((stored[REMINDER_LINKS_KEY] as Record<string, string> | undefined) ?? {})[notificationId] ?? "/app/inbox";
  await chrome.tabs.create({ url: `${WEB_APP_URL}${path}` });
  chrome.notifications.clear(notificationId);
  void apiFetch(`/notifications/${notificationId.slice("reminder:".length)}/read`, { method: "PATCH" }).catch(() => undefined);
}

chrome.notifications.onClicked.addListener((id) => void openReminder(id));
chrome.notifications.onButtonClicked.addListener((id) => void openReminder(id));

let ticks = 0;
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== TICK) return;
  void checkReminders().catch(() => undefined);
  // The saved-page hashes refresh themselves when old; this keeps them warm.
  if (++ticks % 10 === 0) {
    void savedKeys().catch(() => undefined);
    void refreshSaveToMenu();
  }
});

// --- Search from the address bar: "sv" then a space -------------------------

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

chrome.omnibox.setDefaultSuggestion({ description: "Search your Savedly library for <match>%s</match>" });

let searchTimer: ReturnType<typeof setTimeout> | null = null;
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (searchTimer) clearTimeout(searchTimer);
  const query = text.trim();
  if (query.length < 2) return;
  searchTimer = setTimeout(() => {
    apiFetch<{ id: string; title: string; url: string | null; source: string | null }[]>(`/memories?q=${encodeURIComponent(query)}&limit=6`)
      .then((items) =>
        suggest(
          items.map((m) => ({
            content: m.url ?? `${WEB_APP_URL}/app/memories/${m.id}`,
            description: `${escapeXml(m.title)}${m.source ? ` <dim>${escapeXml(m.source)}</dim>` : ""}`,
          })),
        ),
      )
      .catch(() => undefined);
  }, 200);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = /^https?:\/\//.test(text) ? text : `${WEB_APP_URL}/app/search?q=${encodeURIComponent(text.trim())}`;
  if (disposition === "currentTab") void chrome.tabs.update({ url });
  else void chrome.tabs.create({ url, active: disposition === "newForegroundTab" });
});

startTicking();

// --- Highlights ---------------------------------------------------------------
//
// The content script draws them; this worker talks to the server. A page's
// highlights are fetched only when its hash is among the highlighted pages'.

interface PageHighlight {
  id: string;
  text: string;
  prefix: string;
  suffix: string;
  color: string;
  note: string | null;
}

async function sendPageHighlights(tabId: number, url: string): Promise<void> {
  if (!(await signedIn()) || !(await hasHighlights(url))) return;
  const { highlights } = await apiFetch<{ memoryId: string | null; highlights: PageHighlight[] }>(`/highlights/page?url=${encodeURIComponent(url)}`);
  if (highlights.length) chrome.tabs.sendMessage(tabId, { action: "SHOW_HIGHLIGHTS", url, highlights }, () => void chrome.runtime.lastError);
}

function failure(err: unknown) {
  if (err instanceof ApiError && err.status === 401) return { ok: false, signedOut: true, error: "Sign in to Savedly to keep highlights." };
  return { ok: false, error: err instanceof Error ? err.message : "Couldn't save the highlight." };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ADD_HIGHLIGHT") {
    const { url, title, text, prefix, suffix, color, note } = request;
    apiFetch<{ highlight: PageHighlight; memoryId: string; savedPage: boolean }>("/highlights", {
      method: "POST",
      body: JSON.stringify({ url, title, text, prefix, suffix, color, note }),
    })
      .then(async (result) => {
        await Promise.all([rememberSaved(url), rememberHighlighted(url)]);
        if (sender.tab?.id != null) void showSavedBadge(sender.tab.id, url);
        sendResponse({ ok: true, ...result });
      })
      .catch((err) => sendResponse(failure(err)));
    return true;
  }
  if (request.action === "UPDATE_HIGHLIGHT") {
    apiFetch<PageHighlight>(`/highlights/${request.id}`, { method: "PATCH", body: JSON.stringify({ color: request.color, note: request.note }) })
      .then((highlight) => sendResponse({ ok: true, highlight }))
      .catch((err) => sendResponse(failure(err)));
    return true;
  }
  if (request.action === "DELETE_HIGHLIGHT") {
    apiFetch(`/highlights/${request.id}`, { method: "DELETE" })
      .then(() => {
        // That may have been the page's last one.
        refreshHighlighted();
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse(failure(err)));
    return true;
  }
  return undefined;
});

// --- Side panel -------------------------------------------------------------
//
// Savedly beside the page (src/sidepanel). It opens from the keyboard
// command, the right-click menu, the popup and the on-page button. It shows
// the page in the current tab, which this worker knows from the content
// script's PAGE_SEEN reports (no "tabs" permission needed), kept in session
// storage so a sleeping worker doesn't forget them.

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-side-panel" && tab?.windowId != null) void chrome.sidePanel.open({ windowId: tab.windowId });
});

const tabPageKey = (tabId: number) => `tab-page:${tabId}`;
const tabLoadKey = (tabId: number) => `tab-load:${tabId}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if ((request.action === "PAGE_SEEN" || request.action === "PAGE_TITLE") && sender.tab?.id != null && typeof request.url === "string") {
    const page = { url: request.url, title: typeof request.title === "string" ? request.title : "", at: Date.now() };
    void chrome.storage.session.set({ [tabPageKey(sender.tab.id)]: page });
    // The panel, if it's open, follows navigation in the tab it shows.
    chrome.runtime.sendMessage({ action: "TAB_PAGE", tabId: sender.tab.id, windowId: sender.tab.windowId, url: page.url, title: page.title }, () => void chrome.runtime.lastError);
    return undefined;
  }
  if (request.action === "GET_TAB_PAGE" && typeof request.tabId === "number") {
    resolveTabPage(request.tabId).then(sendResponse, () => sendResponse(null));
    return true;
  }
  if (request.action === "OPEN_SIDE_PANEL" && sender.tab?.id != null) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => undefined);
    return undefined;
  }
  return undefined;
});

/**
 * The page in a tab, for the side panel. From what the content script last
 * reported; failing that (the extension was reloaded or updated since, which
 * clears that record and disconnects the scripts already running in open
 * tabs), by asking the tab's content script; failing that, from the tab
 * itself, whose address Chrome shares while the person is using the
 * extension on it (clicking its icon, its shortcut, its right-click menu).
 */
async function resolveTabPage(tabId: number): Promise<{ url: string; title: string } | null> {
  const key = tabPageKey(tabId);
  const stored = (await chrome.storage.session.get(key))[key] as { url: string; title: string } | undefined;
  return stored ?? askTab(tabId);
}

/** Which page a tab shows, from its content script or, failing that, the tab; remembered when found. */
async function askTab(tabId: number): Promise<{ url: string; title: string } | null> {
  const key = tabPageKey(tabId);
  const reply = await new Promise<{ url?: string; title?: string } | null>((resolve) =>
    chrome.tabs.sendMessage(tabId, { action: "WHICH_PAGE" }, { frameId: 0 }, (r) => resolve(chrome.runtime.lastError ? null : (r ?? null))),
  );
  let page = typeof reply?.url === "string" ? { url: reply.url, title: reply.title ?? "" } : null;
  if (!page) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url && /^https?:\/\//.test(tab.url)) page = { url: tab.url, title: tab.title ?? "" };
  }
  if (page) await chrome.storage.session.set({ [key]: { ...page, at: Date.now() } });
  return page;
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  chrome.runtime.sendMessage({ action: "ACTIVE_TAB", tabId, windowId }, () => void chrome.runtime.lastError);
});
chrome.tabs.onRemoved.addListener((tabId) => void chrome.storage.session.remove([tabPageKey(tabId), tabLoadKey(tabId)]));

// Pages the content script can't run on (the new tab page, chrome://, the Web
// Store) never report themselves, so the panel would keep showing the page
// before. When a tab finishes loading and nothing reported since it started,
// the tab is asked which page it's on: the content script answers; no answer
// means there's no web page in it. (A "loading" status also comes when a page
// only rewrites its own address, as Next.js does on every load, hence asking
// rather than assuming. Status changes arrive without the "tabs" permission;
// only the address and title are withheld.)
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "loading") void chrome.storage.session.set({ [tabLoadKey(tabId)]: Date.now() });
  if (info.status !== "complete") return;
  setTimeout(async () => {
    const stored = await chrome.storage.session.get([tabPageKey(tabId), tabLoadKey(tabId)]);
    const page = stored[tabPageKey(tabId)] as { at?: number } | undefined;
    const loadedAt = stored[tabLoadKey(tabId)] as number | undefined;
    if (loadedAt == null || (page?.at ?? 0) >= loadedAt) return;
    const found = await askTab(tabId);
    if (!found) await chrome.storage.session.remove(tabPageKey(tabId));
    chrome.runtime.sendMessage({ action: "TAB_PAGE", tabId, windowId: tab.windowId, url: found?.url ?? null, title: found?.title ?? null }, () => void chrome.runtime.lastError);
  }, 1200);
});

// --- Right-click "Save to collection ▸" ----------------------------------------
// The five collections filed into most recently, one click away for the page
// or a link. Rebuilt after saves and every ten minutes.

const SAVE_TO = "save-to";

async function refreshSaveToMenu(): Promise<void> {
  if (!(await signedIn())) return;
  let recent: { id: string; name: string; icon: string }[];
  try {
    recent = await apiFetch<{ id: string; name: string; icon: string }[]>("/collections/recent");
  } catch {
    return;
  }
  // Removing the parent removes its items too.
  await new Promise<void>((resolve) => chrome.contextMenus.remove(SAVE_TO, () => resolve(void chrome.runtime.lastError)));
  if (recent.length === 0) return;
  chrome.contextMenus.create({ id: SAVE_TO, parentId: "savedly-root", title: "Save to collection", contexts: ["page", "link"] }, () => void chrome.runtime.lastError);
  for (const c of recent.slice(0, 5)) {
    const icon = /^\p{Extended_Pictographic}/u.test(c.icon) ? c.icon : "📁";
    chrome.contextMenus.create({ id: `${SAVE_TO}:${c.id}`, parentId: SAVE_TO, title: `${icon} ${c.name}`, contexts: ["page", "link"] }, () => void chrome.runtime.lastError);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);
  if (!id.startsWith(`${SAVE_TO}:`)) return;
  const collectionIds = [id.slice(SAVE_TO.length + 1)];
  const save = info.linkUrl
    ? createMemory({ type: "web", url: info.linkUrl, title: info.selectionText || new URL(info.linkUrl).hostname, description: `Saved from: ${tab?.title || "Webpage"}`, collectionIds })
    : tab?.url
      ? createMemory({ type: "web", url: tab.url, title: tab.title || "Saved Page", collectionIds })
      : Promise.resolve();
  save.catch(notifySaveError);
});

// --- Welcome tour -------------------------------------------------------------

function openWelcome(): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome/welcome.html") });
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "take-the-tour") openWelcome();
});

// --- Open tabs after an install or update --------------------------------------

async function reconnectOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }).catch(() => [] as chrome.tabs.Tab[]);
  const script = chrome.runtime.getManifest().content_scripts?.[0]?.js ?? ["content.js"];
  for (const tab of tabs) {
    // A discarded tab loads the content script by itself when it's woken.
    if (tab.id == null || tab.discarded) continue;
    void chrome.scripting.executeScript({ target: { tabId: tab.id }, files: script }).catch(() => undefined);
  }
}
