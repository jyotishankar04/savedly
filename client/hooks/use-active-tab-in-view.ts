import { useEffect, type RefObject } from "react";

/**
 * In a tab bar that scrolls sideways (a phone's Settings or admin menu), keeps
 * the current tab, the one with aria-current="page" inside `ref`, scrolled
 * into the middle of its bar, so the page you're on is never a tab off-screen.
 * Runs again whenever `current` (the path) changes. Only the bar scrolls, not
 * the page.
 */
export function useActiveTabInView(ref: RefObject<HTMLElement | null>, current: string) {
  useEffect(() => {
    const tab = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const bar = tab?.parentElement;
    if (!tab || !bar || bar.scrollWidth <= bar.clientWidth) return;
    const offset = tab.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    bar.scrollTo({ left: bar.scrollLeft + offset - (bar.clientWidth - tab.offsetWidth) / 2 });
  }, [ref, current]);
}
