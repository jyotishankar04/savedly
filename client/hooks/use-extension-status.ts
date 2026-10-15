"use client";

import { useEffect, useState } from "react";

/**
 * Whether this browser can take the Savedly extension, and whether it already
 * has it, so the app only suggests installing it to someone who can and
 * hasn't.
 *
 * - "unsupported": a phone or tablet, or a browser that isn't Chromium based
 *   (the extension is in the Chrome Web Store, which serves Chrome, Edge,
 *   Brave and Opera).
 * - "installed": the extension has marked this page. From 1.0.1 its content
 *   script sets data-savedly-extension on savedly.app only (extension/src/
 *   content/content-script.ts); 1.0.0 shows its on-page button instead, which
 *   is there whenever someone is signed in to it and hasn't hidden it.
 * - "missing": neither appeared within a few seconds of the page loading.
 *
 * One limit: Chrome doesn't add an extension's script to tabs that were
 * already open when it was installed, so a tab won't notice an install made
 * while it's open until it reloads.
 */
export type ExtensionStatus = "checking" | "installed" | "missing" | "unsupported";

const WAIT_MS = 3000;

function canInstall(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean; brands?: { brand: string }[] } };
  if (nav.userAgentData?.mobile || window.matchMedia("(pointer: coarse)").matches) return false;
  const brands = nav.userAgentData?.brands?.map((b) => b.brand).join(" ") ?? "";
  return /Chromium|Google Chrome|Microsoft Edge|Brave|Opera/i.test(brands) || /\bChrome\/\d/.test(navigator.userAgent);
}

function hasExtension(): boolean {
  return Boolean(document.documentElement.dataset.savedlyExtension) || Boolean(document.getElementById("savedly-floating-button"));
}

export function useExtensionStatus(): ExtensionStatus {
  const [status, setStatus] = useState<ExtensionStatus>("checking");

  useEffect(() => {
    // Everything here reads the browser, so it settles after mount (the
    // server render always says "checking").
    if (!canInstall()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser, an outside system
      setStatus("unsupported");
      return;
    }
    if (hasExtension()) {
      setStatus("installed");
      return;
    }
    // The content script runs once the page is idle, so give it a moment.
    const observer = new MutationObserver(() => {
      if (hasExtension()) {
        setStatus("installed");
        observer.disconnect();
        window.clearTimeout(timer);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-savedly-extension"], childList: true });
    const timer = window.setTimeout(() => {
      observer.disconnect();
      setStatus(hasExtension() ? "installed" : "missing");
    }, WAIT_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return status;
}
