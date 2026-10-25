"use client";

import { useEffect, type RefObject } from "react";
import type { useRouter } from "next/navigation";

type Options = {
  pathname: string;
  router: ReturnType<typeof useRouter>;
  saveModalOpen: boolean;
  saveStep: 1 | "done";
  captureFormRef: RefObject<HTMLFormElement | null>;
  openCaptureModal: () => void;
  toggleSidebar: () => void;
  openSearch: () => void;
  openShortcuts: () => void;
};

/**
 * Global keyboard shortcuts. Note: Ctrl/Cmd+N and Ctrl/Cmd+P are reserved
 * by the browser itself (new window / print) in Chrome and Firefox — their
 * preventDefault() is a no-op there, so these two only actually fire in
 * browsers/contexts that don't intercept them first (still wired here on
 * the chance they do, and so the binding is correct if that ever changes).
 */
export function useGlobalShortcuts({ pathname, router, saveModalOpen, saveStep, captureFormRef, openCaptureModal, toggleSidebar, openSearch, openShortcuts }: Options) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          openSearch();
          break;
        case "q":
          e.preventDefault();
          openCaptureModal();
          break;
        case "enter":
          // The editor uses Ctrl/⌘+Enter to tick a to-do; then it isn't a save.
          if (saveModalOpen && saveStep === 1 && !e.defaultPrevented) {
            e.preventDefault();
            captureFormRef.current?.requestSubmit();
          }
          break;
        case "b":
          e.preventDefault();
          toggleSidebar();
          break;
        case "n":
          e.preventDefault();
          router.push("/app/notifications");
          break;
        case "p":
          e.preventDefault();
          router.push("/app/settings");
          break;
        // Ask-only — same two actions as the floating dock's "New
        // chat"/"Chat history" buttons (AskPage listens for these same
        // events), just reachable without needing the dock visible.
        case "j":
          if (pathname === "/app/ask") {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("ask:new-chat"));
          }
          break;
        case "h":
          if (pathname === "/app/ask") {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("ask:open-history"));
          }
          break;
        case "/":
          e.preventDefault();
          openShortcuts();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveModalOpen, saveStep, router, openCaptureModal, toggleSidebar, pathname, captureFormRef, openSearch, openShortcuts]);
}
