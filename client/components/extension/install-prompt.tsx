"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, ChromeIcon } from "@hugeicons/core-free-icons";
import { useExtensionStatus } from "@/hooks/use-extension-status";
import { CHROME_WEB_STORE_URL } from "@/lib/extension";

/**
 * A small card in the bottom-right corner of the app suggesting the Chrome
 * extension, for someone on a desktop Chromium browser who doesn't have it.
 * It waits a few seconds so it never greets someone the moment a page opens,
 * sits above the Ask button, and is hidden on phones.
 *
 * "Not now" or the close button keeps it away for three weeks; "Add to
 * Chrome" for a week, since an install made in an open tab isn't noticed
 * until the page reloads (see useExtensionStatus). Both are remembered in
 * this browser only, which is all a suggestion needs.
 */
const STORAGE_KEY = "sfl:extension-prompt-until";
const SHOW_AFTER_MS = 5000;
const DAY = 24 * 60 * 60 * 1000;

function snoozedUntil(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function snooze(days: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + days * DAY));
  } catch {
    // Private mode or blocked storage: it simply may come back next visit.
  }
}

export function ExtensionInstallPrompt() {
  const status = useExtensionStatus();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "missing" || snoozedUntil() > Date.now()) return;
    const timer = window.setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  function close(days: number) {
    snooze(days);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="complementary"
          aria-label="Get the Savedly extension"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed right-6 bottom-24 z-40 w-[20rem] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl shadow-black/15 ring-1 ring-foreground/10 max-md:hidden"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => close(21)}
            className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground ring-1 ring-foreground/10 backdrop-blur transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={Close} strokeWidth={2} className="h-3.5 w-3.5" />
          </button>

          {/* The extension in use: the same short loop as the What's new card. */}
          <div className="relative aspect-[16/9] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- an animated WebP loop */}
            <img src="/whats-new/loops/extension.webp" alt="" className="h-full w-full object-cover object-top" />
          </div>

          <div className="-mt-2 relative px-5 pb-5 text-center">
            <p className="text-[17px] font-medium tracking-[-0.02em] text-foreground">Save from any page</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Add Savedly to Chrome to save the page you&apos;re on, a link, some text or a screenshot, without leaving it.
            </p>
            <a
              href={CHROME_WEB_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close(7)}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HugeiconsIcon icon={ChromeIcon} strokeWidth={2} className="h-4 w-4" />
              Add to Chrome
            </a>
            <button type="button" onClick={() => close(21)} className="mt-2 h-8 w-full rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Not now
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
