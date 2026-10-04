// Content script to scrape webpage metadata for Memora Capture extension.
// Auth token sync lives in background/service-worker.ts via chrome.cookies —
// the web app's auth cookie is httpOnly, so page-context JS (this file)
// can never read it directly; a prior version tried a localStorage read here
// and could never have worked.
//
// No imports in this file, deliberately — content scripts always run as
// classic scripts (manifest.json's content_scripts has no "type: module"
// option, unlike the background service worker), so an `import` statement
// here is a hard runtime failure, not just a style choice. Vite will
// happily emit one anyway if this file imports from a module shared with
// another entry point (it did, the first time this constant was pulled in
// from ../lib/config — silently broke the whole content script, since
// nothing in the build catches "this chunk must stay import-free").
// TOKEN_STORAGE_KEY and SHOW_FLOATING_ICON_STORAGE_KEY below must be kept
// in sync with ../lib/config.ts by hand.
const TOKEN_STORAGE_KEY = "memora_token";
const SHOW_FLOATING_ICON_STORAGE_KEY = "memora_show_floating_icon";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_METADATA") {
    const description = getMetaTag("description") || getMetaTag("og:description") || "";
    const previewImage = getMetaTag("og:image") || "";
    const keywords = getMetaTag("keywords") || "";

    sendResponse({
      description,
      previewImage,
      keywords
    });
  }

  // START_SELECTION kicks off multi-second work (the drag interaction) and
  // reports its real result later via a completely separate
  // SCREENSHOT_REGION_SELECTED message — it must acknowledge THIS message
  // right away rather than leaving its channel open for all of that.
  // Chrome eventually times out a channel nothing ever responds on and
  // reports it to the sender as chrome.runtime.lastError, which
  // dispatchCaptureToActiveTab (service-worker.ts) was reading as "capture
  // failed" — even after the real capture had already succeeded
  // independently. That's what caused "Can't capture this page" to fire
  // alongside an actually-successful save.
  if (request.action === "START_SELECTION") {
    startRegionSelection({ note: request.note, tags: request.tags, collectionIds: request.collectionIds });
    sendResponse({ received: true });
  }

  if (request.action === "CAPTURE_FULL_PAGE") {
    captureFullViewport({ note: request.note, tags: request.tags, collectionIds: request.collectionIds });
    sendResponse({ received: true });
  }

  return true;
});

function getMetaTag(nameOrProperty: string): string | null {
  const meta = document.querySelector(
    `meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`
  );
  return meta ? meta.getAttribute("content") : null;
}

// --- Screenshot region selection ---------------------------------------
//
// Drag-to-select overlay (like the OS-level "capture area" tools). This
// file only figures out WHAT region was picked and WHAT text lives inside
// it — the actual pixel capture has to happen in the background service
// worker (chrome.tabs.captureVisibleTab isn't available to content
// scripts), so on mouseup this just hands the rect off via a message and
// gets out of the way.

const OVERLAY_ID = "memora-screenshot-selection-overlay";
const MAX_EXTRACTED_TEXT_LENGTH = 5000;

interface SelectionMeta {
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}

function startRegionSelection(meta: SelectionMeta): void {
  // Self-heals from a selection that didn't clean up properly (see the
  // window-level mouseup/blur listeners below for why that could happen) —
  // checking the DOM directly instead of a separate boolean flag means
  // there's nothing that can drift out of sync with reality and silently
  // block every future screenshot attempt on this page until it's reloaded.
  document.getElementById(OVERLAY_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(15,17,21,0.25);";

  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;border:1.5px solid #1447E6;background:rgba(20,71,230,0.15);display:none;pointer-events:none;";
  overlay.appendChild(box);

  const hint = document.createElement("div");
  hint.textContent = "Drag to select an area · Esc to cancel";
  hint.style.cssText =
    "position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;" +
    "font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:6px 12px;border-radius:8px;pointer-events:none;";
  overlay.appendChild(hint);

  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  const cleanup = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("mouseup", onWindowMouseUp, true);
    window.removeEventListener("blur", cleanup);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") cleanup();
  };

  const finalize = (endX: number, endY: number) => {
    if (!dragging) return;
    dragging = false;

    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };

    cleanup();

    // A click rather than a drag — nothing meaningful was selected.
    if (rect.width < 10 || rect.height < 10) return;

    chrome.runtime.sendMessage({
      action: "SCREENSHOT_REGION_SELECTED",
      rect,
      dpr: window.devicePixelRatio || 1,
      extractedText: extractTextInRect(rect),
      pageTitle: document.title,
      pageUrl: location.href,
      note: meta.note,
      tags: meta.tags,
      collectionIds: meta.collectionIds,
    });
  };

  // The overlay's own mouseup handles the normal case. This window-level
  // one (capture phase, so it runs first and is never blocked by a page
  // script stopping propagation) is what actually fixes the "sometimes
  // just doesn't work" bug: dragging past the edge of the viewport and
  // releasing the mouse there never fires mouseup ON the overlay at all,
  // which used to leave it (and every future screenshot attempt) stuck
  // until the page was reloaded. finalize()'s `dragging` guard makes it
  // safe to also fire from the overlay's own listener for a normal
  // in-viewport release — the second call is just a no-op.
  const onWindowMouseUp = (e: MouseEvent) => finalize(e.clientX, e.clientY);

  overlay.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.display = "block";
    updateBox(startX, startY, startX, startY);
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    updateBox(startX, startY, e.clientX, e.clientY);
  });

  overlay.addEventListener("mouseup", (e) => finalize(e.clientX, e.clientY));

  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("mouseup", onWindowMouseUp, true);
  // Alt-tabbing or clicking into another app mid-drag: cancel cleanly
  // rather than leaving the overlay stranded on top of the page.
  window.addEventListener("blur", cleanup);

  function updateBox(x1: number, y1: number, x2: number, y2: number) {
    box.style.left = `${Math.min(x1, x2)}px`;
    box.style.top = `${Math.min(y1, y2)}px`;
    box.style.width = `${Math.abs(x2 - x1)}px`;
    box.style.height = `${Math.abs(y2 - y1)}px`;
  }
}

// --- Full-viewport screenshot ---------------------------------------------
//
// "Full page" here means the visible viewport, not the whole scrollable
// page. An earlier version scrolled through the page and stitched every
// section together, but that meant one chrome.tabs.captureVisibleTab call
// per section — Chrome hard-caps how many of those can happen per second
// (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND), and any page taller than a
// few screens reliably tripped it. This reuses the exact same
// SCREENSHOT_REGION_SELECTED message (and so the exact same crop/upload/
// save pipeline in the background worker) as a dragged region — the
// "rect" is just the whole current viewport instead of one the user drew,
// which is also exactly one captureVisibleTab call, same as Region mode.
function captureFullViewport(meta: SelectionMeta): void {
  const rect = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  chrome.runtime.sendMessage({
    action: "SCREENSHOT_REGION_SELECTED",
    rect,
    dpr: window.devicePixelRatio || 1,
    extractedText: extractTextInRect(rect),
    pageTitle: document.title,
    pageUrl: location.href,
    note: meta.note,
    tags: meta.tags,
    collectionIds: meta.collectionIds,
  });
}

/** Collects the rendered text of every text node whose on-screen position intersects `rect` — the same "what's actually visible here" signal a human eye would read off the selected area, not a DOM-structural guess. */
function extractTextInRect(rect: { x: number; y: number; width: number; height: number }): string {
  const bounds = { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const style = getComputedStyle(parent);
      if (style.visibility === "hidden" || style.display === "none") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const range = document.createRange();
  const pieces: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.right >= bounds.left && r.left <= bounds.right && r.bottom >= bounds.top && r.top <= bounds.bottom) {
        pieces.push(node.nodeValue!.trim());
        break;
      }
    }
    if (pieces.join(" ").length > MAX_EXTRACTED_TEXT_LENGTH) break;
  }

  return pieces.join(" ").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

// --- Floating quick-actions button ----------------------------------------
//
// A small always-on-page button (bottom-right, the same pattern as
// Grammarly/Notion-style clippers) for triggering a capture without
// reaching for the toolbar icon. Shown only when signed in AND the user
// hasn't turned it off (SHOW_FLOATING_ICON_STORAGE_KEY, toggled from the
// popup) — both read directly from chrome.storage.local, which content
// scripts can access without a round trip through the background worker.
// Reacts live to both changing (storage.onChanged), so signing in makes
// it appear immediately rather than needing a page reload.

const FLOATING_BUTTON_ID = "memora-floating-button";
const FLOATING_MENU_ID = "memora-floating-menu";

let floatingButtonEl: HTMLButtonElement | null = null;
let floatingMenuEl: HTMLDivElement | null = null;

function shouldShowFloatingButton(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_STORAGE_KEY, SHOW_FLOATING_ICON_STORAGE_KEY], (result) => {
      const signedIn = !!result[TOKEN_STORAGE_KEY];
      const enabled = result[SHOW_FLOATING_ICON_STORAGE_KEY] ?? true; // defaults on
      resolve(signedIn && enabled);
    });
  });
}

async function refreshFloatingButtonVisibility(): Promise<void> {
  if (await shouldShowFloatingButton()) {
    createFloatingButton();
  } else {
    removeFloatingButton();
  }
}

function createFloatingButton(): void {
  if (floatingButtonEl || !document.body) return;

  const button = document.createElement("button");
  button.id = FLOATING_BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "Memora quick actions");
  button.title = "Memora quick actions";
  button.textContent = "M";
  button.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:44px;height:44px;border-radius:50%;border:none;" +
    "background:#1447E6;color:#fff;cursor:pointer;z-index:2147483646;box-shadow:0 4px 14px rgba(20,71,230,0.4);" +
    "display:flex;align-items:center;justify-content:center;font:700 16px -apple-system,BlinkMacSystemFont,sans-serif;" +
    "padding:0;transition:transform 0.15s ease;";
  button.addEventListener("mouseenter", () => (button.style.transform = "scale(1.08)"));
  button.addEventListener("mouseleave", () => (button.style.transform = "scale(1)"));
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (floatingMenuEl) closeFloatingMenu();
    else openFloatingMenu();
  });

  document.documentElement.appendChild(button);
  floatingButtonEl = button;
}

function removeFloatingButton(): void {
  closeFloatingMenu();
  floatingButtonEl?.remove();
  floatingButtonEl = null;
}

function openFloatingMenu(): void {
  if (floatingMenuEl) return;

  const menu = document.createElement("div");
  menu.id = FLOATING_MENU_ID;
  menu.style.cssText =
    "position:fixed;right:20px;bottom:72px;z-index:2147483646;display:flex;flex-direction:column;gap:2px;" +
    "background:#1c1c1e;border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,0.35);min-width:180px;";

  const actions: { label: string; onClick: () => void }[] = [
    { label: "Save this page", onClick: quickSavePage },
    { label: "Screenshot an area", onClick: () => startRegionSelection({}) },
    {
      label: "Screenshot visible page",
      onClick: () => captureFullViewport({}),
    },
  ];

  for (const action of actions) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = action.label;
    item.style.cssText =
      "display:block;width:100%;text-align:left;white-space:nowrap;border:none;background:transparent;color:#fff;" +
      "font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:9px 12px;border-radius:8px;cursor:pointer;";
    item.addEventListener("mouseenter", () => (item.style.background = "rgba(255,255,255,0.1)"));
    item.addEventListener("mouseleave", () => (item.style.background = "transparent"));
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      closeFloatingMenu();
      action.onClick();
    });
    menu.appendChild(item);
  }

  document.documentElement.appendChild(menu);
  floatingMenuEl = menu;

  // Capture phase so this reliably sees the click before any page script
  // might stop it, same reasoning as the selection overlay's own listeners.
  document.addEventListener("click", closeFloatingMenu, true);
  document.addEventListener("keydown", onFloatingMenuKeyDown, true);
}

function closeFloatingMenu(): void {
  floatingMenuEl?.remove();
  floatingMenuEl = null;
  document.removeEventListener("click", closeFloatingMenu, true);
  document.removeEventListener("keydown", onFloatingMenuKeyDown, true);
}

function onFloatingMenuKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") closeFloatingMenu();
}

/** No note/tags/collections here (unlike the popup's flows) — this is the fast path, not the customizable one; the popup is still there for that. */
function quickSavePage(): void {
  chrome.runtime.sendMessage({
    action: "QUICK_SAVE_PAGE",
    title: document.title || "Untitled Webpage",
    url: location.href,
    description: getMetaTag("description") || getMetaTag("og:description") || undefined,
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (TOKEN_STORAGE_KEY in changes || SHOW_FLOATING_ICON_STORAGE_KEY in changes) {
    refreshFloatingButtonVisibility();
  }
});

// --- Clipboard monitoring for quick URL saves ----- (new feature)
//
// Detects when URLs are copied and offers quick-save. Paste events are
// MV3-compliant and don't require extra permissions.

const URL_PATTERN = /^https?:\/\/[^\s]+$/;
let lastSavedUrl = "";
let clipboardDebounceTimer: number | null = null;

document.addEventListener(
  "paste",
  (event) => {
    const text = event.clipboardData?.getData("text")?.trim();
    if (!text || !URL_PATTERN.test(text) || text === lastSavedUrl) return;

    lastSavedUrl = text;

    // Debounce rapid pastes (500ms)
    if (clipboardDebounceTimer) clearTimeout(clipboardDebounceTimer);
    clipboardDebounceTimer = window.setTimeout(() => {
      chrome.runtime.sendMessage(
        { action: "CLIPBOARD_URL_DETECTED", url: text },
        (response) => {
          if (!response) return;
          if (response.ok) {
            console.log("Memora: Saved URL from clipboard");
          } else {
            console.log("Memora: Could not save clipboard URL:", response.error);
          }
        }
      );
    }, 500);
  },
  true
);

refreshFloatingButtonVisibility();
