/** What it's called where people see it: Firefox says "sidebar". */
export const PANEL_NAME = __FIREFOX__ ? "sidebar" : "side panel";

/**
 * Opens Savedly beside the page: Chrome's side panel, or Firefox's sidebar.
 * Firefox only opens it from something the person just did (a click, a menu,
 * a shortcut), so call it straight from that handler.
 */
export function openSidePanel(target: { windowId?: number; tabId?: number }): Promise<void> {
  if (__FIREFOX__) {
    const sidebar = (globalThis as { browser?: { sidebarAction?: { open(): Promise<void> } } }).browser?.sidebarAction;
    return sidebar ? sidebar.open() : Promise.resolve();
  }
  return chrome.sidePanel.open(target as chrome.sidePanel.OpenOptions);
}
