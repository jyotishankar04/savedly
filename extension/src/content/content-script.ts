// Content script for the Savedly extension: reads a page's description for
// the popup, draws the screenshot selection, and shows the on-page button.
//
// No imports in this file, deliberately — content scripts always run as
// classic scripts (manifest.json's content_scripts has no "type: module"
// option, unlike the background service worker), so an `import` statement
// here is a hard runtime failure, not just a style choice. Vite will
// happily emit one anyway if this file imports from a module shared with
// another entry point (it did, the first time a constant was pulled in
// from ../lib/config — silently broke the whole content script, since
// nothing in the build catches "this chunk must stay import-free").
// The two storage keys below must be kept in sync with ../lib/config.ts by
// hand. __WEB_APP_URL__ is filled in by the build (vite.config.ts).
const SIGNED_IN_STORAGE_KEY = "savedly_signed_in";
const SHOW_FLOATING_ICON_STORAGE_KEY = "savedly_show_floating_icon";
// Where the floating button was dragged to, the same on every site: which edge, and how far down (0 top … 1 bottom).
const FLOATING_POSITION_STORAGE_KEY = "savedly_floating_position";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_METADATA") {
    const description = getMetaTag("description") || getMetaTag("og:description") || "";
    const previewImage = getMetaTag("og:image") || "";
    const keywords = getMetaTag("keywords") || "";

    sendResponse({
      description,
      previewImage,
      keywords,
      images: coverCandidates(previewImage),
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

/**
 * Pictures that could be the saved page's cover, best first: the page's own
 * og:image and twitter:image, then the largest images on it (at least 200×120,
 * decoded, http(s)). Up to six.
 */
function coverCandidates(ogImage: string): string[] {
  const absolute = (src: string) => {
    try {
      const url = new URL(src, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const picks = [ogImage, getMetaTag("twitter:image") || ""].map(absolute);
  const imgs = Array.from(document.images)
    .filter((img) => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 120)
    .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
    .map((img) => absolute(img.currentSrc || img.src));
  return [...new Set([...picks, ...imgs].filter(Boolean))].slice(0, 6);
}

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

const OVERLAY_ID = "savedly-screenshot-selection-overlay";
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

// The Savedly mark (client/public/logo.svg), drawn inline so nothing has to
// be loaded from the extension by the page. The gradient ids are prefixed so
// they can't collide with ids the page itself uses.
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none" width="30" height="30" aria-hidden="true" style="display:block;pointer-events:none">' +
  '<defs><linearGradient id="savedly-fb-b" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3D7BFF"/><stop offset="1" stop-color="#0B3FE3"/></linearGradient>' +
  '<linearGradient id="savedly-fb-f" x1="50" y1="50" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#E6EEFF"/><stop offset="1" stop-color="#9DB9FF"/></linearGradient></defs>' +
  '<g transform="translate(13.5 28) rotate(-12 40 40)"><rect width="80" height="80" rx="20" fill="url(#savedly-fb-b)"/>' +
  '<path d="M80 40C73 50 60 50 54 57C47 65 50 74 43 80H60A20 20 0 0 0 80 60Z" fill="url(#savedly-fb-f)"/>' +
  '<path d="M18.5 38A6.5 6.5 0 0 1 31.5 38M44.5 38A6.5 6.5 0 0 1 57.5 38" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
  '<path d="M88 6L95 -4M92 18L102 11" stroke="#2F6BFF" stroke-width="8" stroke-linecap="round"/></g></svg>';

const FLOATING_BUTTON_ID = "savedly-floating-button";
const FLOATING_MENU_ID = "savedly-floating-menu";

let floatingButtonEl: HTMLButtonElement | null = null;
let floatingMenuEl: HTMLDivElement | null = null;

function shouldShowFloatingButton(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([SIGNED_IN_STORAGE_KEY, SHOW_FLOATING_ICON_STORAGE_KEY], (result) => {
      const signedIn = !!result[SIGNED_IN_STORAGE_KEY];
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

// --- Position: draggable, snapping to the nearer side edge -----------------

const BUTTON_SIZE = 44;
const EDGE_GAP = 20;
// A press that moves less than this is a click (opens the menu), not a drag.
const DRAG_THRESHOLD = 5;

interface FloatingPosition {
  side: "left" | "right";
  /** Share of the free height, so it lands in the same place on any window size. */
  y: number;
}

let floatingPosition: FloatingPosition = { side: "right", y: 1 };

function maxTop(): number {
  return Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP);
}

/** Puts the button where `floatingPosition` says, against its edge. */
function placeFloatingButton(animate: boolean): void {
  if (!floatingButtonEl) return;
  const top = EDGE_GAP + floatingPosition.y * (maxTop() - EDGE_GAP);
  const left = floatingPosition.side === "left" ? EDGE_GAP : window.innerWidth - BUTTON_SIZE - EDGE_GAP;
  floatingButtonEl.style.transition = animate ? "left 0.22s cubic-bezier(.2,.8,.2,1), top 0.22s cubic-bezier(.2,.8,.2,1), transform 0.15s ease" : "transform 0.15s ease";
  floatingButtonEl.style.left = `${left}px`;
  floatingButtonEl.style.top = `${top}px`;
}

function loadFloatingPosition(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get([FLOATING_POSITION_STORAGE_KEY], (result) => {
      const saved = result[FLOATING_POSITION_STORAGE_KEY] as FloatingPosition | undefined;
      if (saved && (saved.side === "left" || saved.side === "right") && typeof saved.y === "number") {
        floatingPosition = { side: saved.side, y: Math.min(1, Math.max(0, saved.y)) };
      }
      resolve();
    });
  });
}

/** Drag with mouse, pen or finger; on release it snaps to the nearer edge and is remembered. */
function makeDraggable(button: HTMLButtonElement): void {
  let start: { x: number; y: number; left: number; top: number } | null = null;
  let dragging = false;
  let swallowClick = false;

  button.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const rect = button.getBoundingClientRect();
    start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    dragging = false;
    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener("pointermove", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!dragging) {
      dragging = true;
      closeFloatingMenu();
      button.style.cursor = "grabbing";
      button.style.transition = "transform 0.15s ease";
      button.style.transform = "scale(1.08)";
    }
    const left = Math.min(window.innerWidth - BUTTON_SIZE - 4, Math.max(4, start.left + dx));
    const top = Math.min(window.innerHeight - BUTTON_SIZE - 4, Math.max(4, start.top + dy));
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
  });

  const finish = (e: PointerEvent) => {
    if (!start) return;
    if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId);
    start = null;
    if (!dragging) return;
    dragging = false;
    // The click that ends a drag must not open the menu.
    swallowClick = true;
    button.style.cursor = "grab";
    button.style.transform = "scale(1)";
    const rect = button.getBoundingClientRect();
    const range = maxTop() - EDGE_GAP;
    floatingPosition = {
      side: rect.left + BUTTON_SIZE / 2 < window.innerWidth / 2 ? "left" : "right",
      y: range > 0 ? Math.min(1, Math.max(0, (rect.top - EDGE_GAP) / range)) : 1,
    };
    placeFloatingButton(true);
    chrome.storage.local.set({ [FLOATING_POSITION_STORAGE_KEY]: floatingPosition });
  };
  button.addEventListener("pointerup", finish);
  button.addEventListener("pointercancel", finish);

  button.addEventListener(
    "click",
    (e) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    true,
  );
}

function createFloatingButton(): void {
  if (floatingButtonEl || !document.body) return;

  const button = document.createElement("button");
  button.id = FLOATING_BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-label", "Savedly quick actions (drag to move)");
  button.title = "Savedly quick actions. Drag to move it";
  button.innerHTML = LOGO_SVG;
  button.style.cssText =
    `position:fixed;width:${BUTTON_SIZE}px;height:${BUTTON_SIZE}px;border-radius:50%;border:1px solid rgba(15,17,21,0.08);` +
    "background:#fff;cursor:grab;z-index:2147483646;box-shadow:0 4px 14px rgba(15,17,21,0.18);touch-action:none;user-select:none;" +
    "display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.15s ease;";
  button.addEventListener("mouseenter", () => (button.style.transform = "scale(1.08)"));
  button.addEventListener("mouseleave", () => (button.style.transform = "scale(1)"));
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (floatingMenuEl) closeFloatingMenu();
    else openFloatingMenu();
  });
  makeDraggable(button);

  document.documentElement.appendChild(button);
  floatingButtonEl = button;
  placeFloatingButton(false);
  // The saved spot, once storage answers (a beat after the button appears in the default corner).
  void loadFloatingPosition().then(() => placeFloatingButton(false));
}

window.addEventListener("resize", () => placeFloatingButton(false));

function removeFloatingButton(): void {
  closeFloatingMenu();
  floatingButtonEl?.remove();
  floatingButtonEl = null;
}

function openFloatingMenu(): void {
  if (floatingMenuEl || !floatingButtonEl) return;

  // Beside the button, on its side: above it in the lower half of the screen, below it in the upper half.
  const rect = floatingButtonEl.getBoundingClientRect();
  const horizontal = floatingPosition.side === "left" ? `left:${EDGE_GAP}px;` : `right:${EDGE_GAP}px;`;
  const vertical =
    rect.top > window.innerHeight / 2 ? `bottom:${window.innerHeight - rect.top + 8}px;` : `top:${rect.bottom + 8}px;`;

  const menu = document.createElement("div");
  menu.id = FLOATING_MENU_ID;
  menu.style.cssText =
    `position:fixed;${horizontal}${vertical}z-index:2147483646;display:flex;flex-direction:column;gap:2px;` +
    "background:#1c1c1e;border-radius:12px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,0.35);min-width:180px;";

  const actions: { label: string; onClick: () => void }[] = [
    { label: "Save this page", onClick: quickSavePage },
    { label: "Screenshot an area", onClick: () => startRegionSelection({}) },
    {
      label: "Screenshot visible page",
      onClick: () => captureFullViewport({}),
    },
    {
      label: "Open Savedly side panel",
      onClick: () => chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" }, () => void chrome.runtime.lastError),
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
  if (SIGNED_IN_STORAGE_KEY in changes || SHOW_FLOATING_ICON_STORAGE_KEY in changes) {
    refreshFloatingButtonVisibility();
  }
  // Dragged on another tab: follow, so it's in the same place everywhere.
  const moved = changes[FLOATING_POSITION_STORAGE_KEY]?.newValue as FloatingPosition | undefined;
  if (moved && (moved.side !== floatingPosition.side || moved.y !== floatingPosition.y)) {
    floatingPosition = moved;
    placeFloatingButton(true);
  }
});

// --- Keeping "signed in" current --------------------------------------
//
// Signing in and out happens on the Savedly website. When one of its pages
// loads or comes back into view, ask the background worker to check with the
// server, so the popup and the button above follow without a browser restart.
if (location.origin === __WEB_APP_URL__) {
  // Tell the Savedly website (and only it) that the extension is installed,
  // so it stops suggesting it. Other sites can't see this.
  document.documentElement.dataset.savedlyExtension = chrome.runtime.getManifest().version;

  const syncSignIn = () => {
    // The extension may have been reloaded under this page; then there is
    // no one to tell, and sendMessage throws.
    try {
      chrome.runtime.sendMessage({ action: "SYNC_AUTH" }, () => void chrome.runtime.lastError);
    } catch {
      /* nothing to do */
    }
  };
  syncSignIn();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncSignIn();
  });
}

refreshFloatingButtonVisibility();

// Tells the background which page this is, so the toolbar icon can show a
// check mark when it's already saved. The check itself happens in the
// extension (lib/saved-pages.ts); the address isn't sent to Savedly.
// Single-page apps change the address without reloading, hence the poll.
let reportedUrl = "";
function reportPage(): void {
  if (location.href === reportedUrl) return;
  reportedUrl = location.href;
  try {
    chrome.runtime.sendMessage({ action: "PAGE_SEEN", url: location.href, title: document.title }, () => void chrome.runtime.lastError);
  } catch {
    // The extension was reloaded or updated: this page's script is orphaned until it reloads.
  }
}
reportPage();
setInterval(reportPage, 1500);

// --- Highlights ---------------------------------------------------------------
//
// Select text on any page and a small toolbar offers colours (and a note);
// the passage is marked on the page and saved to Savedly with a little text
// on either side, so it can be found again when the page is revisited.
// Clicking a highlight changes its colour or note, or removes it. Alt+H
// highlights the selection in yellow. Only while signed in.

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "#fde68a",
  green: "#bbf7d0",
  blue: "#bfdbfe",
  pink: "#fbcfe8",
  purple: "#ddd6fe",
};
const HL_ATTR = "data-savedly-highlight";
const CONTEXT_CHARS = 32;
const UI_ATTR = "data-savedly-ui";

let highlighterSignedIn = false;
chrome.storage.local.get([SIGNED_IN_STORAGE_KEY], (result) => (highlighterSignedIn = !!result[SIGNED_IN_STORAGE_KEY]));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && SIGNED_IN_STORAGE_KEY in changes) highlighterSignedIn = !!changes[SIGNED_IN_STORAGE_KEY]!.newValue;
});

const collapse = (text: string) => text.replace(/\s+/g, " ");

function inEditable(node: Node | null): boolean {
  const el = node instanceof Element ? node : node?.parentElement;
  return !!el?.closest(`input, textarea, select, [contenteditable=""], [contenteditable="true"], [${UI_ATTR}]`);
}

/** Text nodes of the page in order, skipping scripts, styles and Savedly's own UI. */
function pageTextNodes(root: Node = document.body): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest(`script, style, noscript, textarea, [${UI_ATTR}]`)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

/** Up to CONTEXT_CHARS of page text before and after a range, for finding it again. */
function contextAround(range: Range): { prefix: string; suffix: string } {
  const nodes = pageTextNodes();
  let before = "";
  let after = "";
  const startIndex = nodes.indexOf(range.startContainer as Text);
  const endIndex = nodes.indexOf(range.endContainer as Text);
  if (startIndex >= 0) {
    before = nodes[startIndex]!.data.slice(0, range.startOffset);
    for (let i = startIndex - 1; i >= 0 && before.length < CONTEXT_CHARS * 2; i--) before = nodes[i]!.data + before;
  }
  if (endIndex >= 0) {
    after = nodes[endIndex]!.data.slice(range.endOffset);
    for (let i = endIndex + 1; i < nodes.length && after.length < CONTEXT_CHARS * 2; i++) after += nodes[i]!.data;
  }
  return { prefix: collapse(before).slice(-CONTEXT_CHARS), suffix: collapse(after).slice(0, CONTEXT_CHARS) };
}

/** Wraps every text piece of a range in a <mark>, splitting text nodes at its edges. */
function wrapRange(range: Range, id: string, color: string): HTMLElement[] {
  const marks: HTMLElement[] = [];
  const nodes = pageTextNodes(range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentNode! : range.commonAncestorContainer);
  for (const node of nodes) {
    if (!range.intersectsNode(node)) continue;
    let start = node === range.startContainer ? range.startOffset : 0;
    let end = node === range.endContainer ? range.endOffset : node.data.length;
    if (end <= start || !node.data.slice(start, end).trim()) continue;
    let target = node;
    if (start > 0) {
      target = target.splitText(start);
      end -= start;
      start = 0;
    }
    if (end < target.data.length) target.splitText(end);
    const mark = document.createElement("mark");
    mark.setAttribute(HL_ATTR, id);
    styleMark(mark, color);
    target.parentNode!.insertBefore(mark, target);
    mark.appendChild(target);
    marks.push(mark);
  }
  return marks;
}

function styleMark(mark: HTMLElement, color: string): void {
  mark.dataset.savedlyColor = color;
  mark.style.cssText = `background:${HIGHLIGHT_COLORS[color] ?? HIGHLIGHT_COLORS.yellow};color:inherit;border-radius:2px;padding:0 1px;cursor:pointer;box-decoration-break:clone;-webkit-box-decoration-break:clone;`;
}

function marksFor(id: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`mark[${HL_ATTR}="${CSS.escape(id)}"]`));
}

function unwrap(id: string): void {
  for (const mark of marksFor(id)) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}

/** A small message at the bottom of the page. */
function pageToast(text: string): void {
  const toast = document.createElement("div");
  toast.setAttribute(UI_ATTR, "");
  toast.textContent = text;
  toast.style.cssText =
    "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#1c1c1e;color:#fff;" +
    "font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:9px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3);";
  document.documentElement.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function send<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError;
        resolve((response ?? { ok: false, error: "The extension didn't answer. Reload the page." }) as T);
      });
    } catch {
      resolve({ ok: false, error: "Savedly was updated. Reload the page to highlight." } as T);
    }
  });
}

interface SaveResult {
  ok: boolean;
  error?: string;
  savedPage?: boolean;
  highlight?: { id: string };
}

async function highlightSelection(color: string, note?: string): Promise<void> {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const text = collapse(selection.toString()).trim();
  if (text.length < 2 || inEditable(range.commonAncestorContainer)) return;
  const { prefix, suffix } = contextAround(range);
  // Drawn now, saved behind it; taken off again if the save fails.
  const tempId = `pending-${Date.now()}`;
  wrapRange(range, tempId, color);
  selection.removeAllRanges();
  hideSelectionToolbar();
  const result = await send<SaveResult>({ action: "ADD_HIGHLIGHT", url: location.href, title: document.title, text: text.slice(0, 5000), prefix, suffix, color, note });
  if (!result.ok || !result.highlight) {
    unwrap(tempId);
    pageToast(result.error ?? "Couldn't save the highlight.");
    return;
  }
  for (const mark of marksFor(tempId)) mark.setAttribute(HL_ATTR, result.highlight.id);
  pageToast(result.savedPage ? "Highlighted, and the page is saved to Savedly" : "Highlighted");
}

// The toolbar over a selection.
let selectionToolbar: HTMLDivElement | null = null;

function hideSelectionToolbar(): void {
  selectionToolbar?.remove();
  selectionToolbar = null;
}

function colorDot(color: string, onClick: () => void, size = 18): HTMLButtonElement {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.title = `Highlight ${color}`;
  dot.setAttribute("aria-label", `Highlight ${color}`);
  dot.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:${HIGHLIGHT_COLORS[color]};cursor:pointer;padding:0;flex:none;`;
  dot.addEventListener("mousedown", (e) => e.preventDefault()); // keep the selection
  dot.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return dot;
}

function showSelectionToolbar(range: Range): void {
  hideSelectionToolbar();
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  const bar = document.createElement("div");
  bar.setAttribute(UI_ATTR, "");
  bar.style.cssText =
    "position:fixed;z-index:2147483647;display:flex;align-items:center;gap:6px;background:#1c1c1e;border-radius:999px;padding:6px 8px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.3);font:12px/1 -apple-system,BlinkMacSystemFont,sans-serif;";
  const logo = document.createElement("span");
  logo.textContent = "Savedly";
  logo.style.cssText = "color:#9ca3af;font-weight:600;padding:0 4px 0 2px;";
  bar.appendChild(logo);
  for (const color of Object.keys(HIGHLIGHT_COLORS)) bar.appendChild(colorDot(color, () => void highlightSelection(color)));

  const noteButton = document.createElement("button");
  noteButton.type = "button";
  noteButton.textContent = "Add a note";
  noteButton.style.cssText = "background:transparent;border:none;color:#fff;font:inherit;cursor:pointer;padding:2px 6px 2px 4px;";
  noteButton.addEventListener("mousedown", (e) => e.preventDefault());
  noteButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const saved = range.cloneRange();
    bar.innerHTML = "";
    bar.style.borderRadius = "12px";
    const input = document.createElement("input");
    input.placeholder = "Your note, then Enter";
    input.style.cssText = "width:220px;border:none;outline:none;border-radius:8px;padding:7px 9px;background:#2c2c2e;color:#fff;font:13px -apple-system,BlinkMacSystemFont,sans-serif;";
    input.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Escape") hideSelectionToolbar();
      if (ev.key === "Enter") {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(saved);
        void highlightSelection("yellow", input.value.trim() || undefined);
      }
    });
    bar.appendChild(input);
    setTimeout(() => input.focus(), 0);
  });
  bar.appendChild(noteButton);

  document.documentElement.appendChild(bar);
  const width = bar.offsetWidth;
  const top = rect.top > 48 ? rect.top - 44 : rect.bottom + 8;
  const left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.left + rect.width / 2 - width / 2));
  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
  selectionToolbar = bar;
}

document.addEventListener("mouseup", (e) => {
  if (!highlighterSignedIn || (e.target instanceof Element && e.target.closest(`[${UI_ATTR}]`))) return;
  // After the browser has settled the selection.
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return hideSelectionToolbar();
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (text.length < 2 || text.length > 5000 || inEditable(range.commonAncestorContainer)) return hideSelectionToolbar();
    showSelectionToolbar(range);
  }, 10);
});
document.addEventListener("mousedown", (e) => {
  if (e.target instanceof Element && e.target.closest(`[${UI_ATTR}]`)) return;
  hideSelectionToolbar();
  hideHighlightPopover();
});
window.addEventListener("scroll", () => hideSelectionToolbar(), { passive: true });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideSelectionToolbar();
    hideHighlightPopover();
  }
  // Alt+H: highlight the selection in yellow.
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "h" || e.key === "H" || e.code === "KeyH") && highlighterSignedIn) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && !inEditable(selection.anchorNode)) {
      e.preventDefault();
      void highlightSelection("yellow");
    }
  }
});

// Clicking a highlight: colour, note, remove.
let highlightPopover: HTMLDivElement | null = null;
const highlightNotes = new Map<string, string | null>();

function hideHighlightPopover(): void {
  highlightPopover?.remove();
  highlightPopover = null;
}

document.addEventListener("click", (e) => {
  const mark = e.target instanceof Element ? e.target.closest<HTMLElement>(`mark[${HL_ATTR}]`) : null;
  if (!mark || !highlighterSignedIn) return;
  const id = mark.getAttribute(HL_ATTR)!;
  if (id.startsWith("pending-")) return;
  e.preventDefault();
  e.stopPropagation();
  hideHighlightPopover();
  const rect = mark.getBoundingClientRect();
  const pop = document.createElement("div");
  pop.setAttribute(UI_ATTR, "");
  pop.style.cssText =
    "position:fixed;z-index:2147483647;display:flex;flex-direction:column;gap:8px;background:#1c1c1e;color:#fff;border-radius:12px;padding:10px;width:240px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.35);font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;";
  const dots = document.createElement("div");
  dots.style.cssText = "display:flex;gap:8px;align-items:center;";
  for (const color of Object.keys(HIGHLIGHT_COLORS)) {
    dots.appendChild(
      colorDot(color, async () => {
        const result = await send<{ ok: boolean; error?: string }>({ action: "UPDATE_HIGHLIGHT", id, color });
        if (!result.ok) return pageToast(result.error ?? "Couldn't change it.");
        for (const m of marksFor(id)) styleMark(m, color);
      }, 20),
    );
  }
  pop.appendChild(dots);
  const note = document.createElement("textarea");
  note.placeholder = "Add a note";
  note.value = highlightNotes.get(id) ?? "";
  note.rows = 2;
  // Every colour set here: a page's own CSS for textareas mustn't decide how this looks.
  note.style.cssText = "width:100%;box-sizing:border-box;border:none;outline:none;border-radius:8px;padding:7px 9px;resize:none;background:#2c2c2e;color:#fff;font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;";
  note.addEventListener("keydown", (ev) => ev.stopPropagation());
  pop.appendChild(note);
  const row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:space-between;gap:8px;";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.style.cssText = "background:transparent;border:none;color:#fca5a5;font:inherit;cursor:pointer;padding:4px 0;";
  remove.addEventListener("click", async () => {
    const result = await send<{ ok: boolean; error?: string }>({ action: "DELETE_HIGHLIGHT", id });
    if (!result.ok) return pageToast(result.error ?? "Couldn't remove it.");
    unwrap(id);
    hideHighlightPopover();
  });
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save note";
  save.style.cssText = "background:#1447E6;border:none;color:#fff;font:inherit;font-weight:600;cursor:pointer;padding:5px 10px;border-radius:8px;";
  save.addEventListener("click", async () => {
    const value = note.value.trim() || null;
    const result = await send<{ ok: boolean; error?: string }>({ action: "UPDATE_HIGHLIGHT", id, note: value });
    if (!result.ok) return pageToast(result.error ?? "Couldn't save the note.");
    highlightNotes.set(id, value);
    hideHighlightPopover();
    pageToast("Note saved");
  });
  row.append(remove, save);
  pop.appendChild(row);
  document.documentElement.appendChild(pop);
  const top = rect.bottom + 8 + 150 > window.innerHeight ? Math.max(8, rect.top - 158) : rect.bottom + 8;
  pop.style.top = `${top}px`;
  pop.style.left = `${Math.min(window.innerWidth - 248, Math.max(8, rect.left))}px`;
  highlightPopover = pop;
}, true);

// Showing a page's highlights again: find each passage by its text and the text around it.
interface StoredHighlight {
  id: string;
  text: string;
  prefix: string;
  suffix: string;
  color: string;
  note: string | null;
}

/** The page's text with whitespace collapsed, and where each character came from. */
function flatText(): { text: string; map: { node: Text; offset: number }[] } {
  let text = "";
  const map: { node: Text; offset: number }[] = [];
  let lastSpace = true;
  for (const node of pageTextNodes()) {
    const data = node.data;
    for (let i = 0; i < data.length; i++) {
      const isSpace = /\s/.test(data[i]!);
      if (isSpace && lastSpace) continue;
      text += isSpace ? " " : data[i];
      map.push({ node, offset: i });
      lastSpace = isSpace;
    }
  }
  return { text, map };
}

function restoreHighlights(list: StoredHighlight[]): StoredHighlight[] {
  const missing: StoredHighlight[] = [];
  for (const h of list) {
    highlightNotes.set(h.id, h.note);
    if (marksFor(h.id).length) continue;
    const { text, map } = flatText();
    const needle = collapse(h.text).trim();
    const withContext = collapse(h.prefix) + needle + collapse(h.suffix);
    let at = h.prefix || h.suffix ? text.indexOf(withContext) : -1;
    at = at >= 0 ? at + collapse(h.prefix).length : text.indexOf(needle);
    if (at < 0 || !map[at] || !map[at + needle.length - 1]) {
      missing.push(h);
      continue;
    }
    const start = map[at]!;
    const end = map[at + needle.length - 1]!;
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset + 1);
    wrapRange(range, h.id, h.color);
  }
  return missing;
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action !== "SHOW_HIGHLIGHTS" || request.url !== location.href) return undefined;
  const missing = restoreHighlights(request.highlights as StoredHighlight[]);
  // A page still loading its content (a single-page app): try the rest once more shortly.
  if (missing.length) setTimeout(() => restoreHighlights(missing), 2500);
  return undefined;
});

// The side panel's highlight list: scroll to one on the page.
chrome.runtime.onMessage.addListener((request) => {
  if (request.action !== "SCROLL_TO_HIGHLIGHT") return undefined;
  const mark = marksFor(String(request.id))[0];
  if (!mark) return undefined;
  mark.scrollIntoView({ block: "center", behavior: "smooth" });
  const marks = marksFor(String(request.id));
  for (const m of marks) m.animate([{ outline: "3px solid #1447E6" }, { outline: "3px solid transparent" }], { duration: 1400 });
  return undefined;
});
