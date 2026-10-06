"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SquareArrowUp01Icon as ShareIcon, XIcon as X } from "@hugeicons/core-free-icons";

// Chrome's install event; not in TypeScript's DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    // Set by the inline script in app/layout.tsx, which can hear the event
    // before this component has loaded.
    __installPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DISMISSED_KEY = "sfl:install-dismissed-at";
const ASK_AGAIN_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 2500;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < ASK_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

/**
 * Offers to install the site as an app, on phones only, a moment after the
 * page has settled. Android (Chrome and friends) gets a real Install button;
 * iPhone has no install API, so it gets the two taps to do it by hand.
 * Dismissing it keeps it away for two weeks, and it never shows inside the
 * installed app.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (standalone || !phone || recentlyDismissed()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setMode(isIos ? "ios" : "android"), SHOW_AFTER_MS);
    };

    // Android only tells us it can install once its own checks have passed.
    const onPrompt = (event: Event) => {
      event.preventDefault();
      window.__installPrompt = event as BeforeInstallPromptEvent;
      offer();
    };
    const onInstalled = () => {
      window.__installPrompt = null;
      setMode(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos || window.__installPrompt) offer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode: it just asks again next visit.
    }
    setMode(null);
  };

  const install = async () => {
    const prompt = window.__installPrompt;
    if (!prompt) return dismiss();
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__installPrompt = null;
    if (outcome === "accepted") setMode(null);
    else dismiss();
  };

  // Inside the app the bottom bar is in the way, so the card sits above it.
  const inApp = pathname.startsWith("/app");

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          role="dialog"
          aria-label="Install Savedly"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 32 } }}
          exit={{ y: 40, opacity: 0, transition: { duration: 0.18 } }}
          className={
            "fixed inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-[0_18px_48px_-16px_rgb(0_0_0/0.45)] md:hidden " +
            (inApp ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]")
          }
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <HugeiconsIcon icon={X} strokeWidth={2.25} className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight">Install Savedly</p>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {mode === "android"
                  ? "Open it from your home screen, and share links and photos straight into it from any app."
                  : "Add it to your home screen to open it like an app, full-screen."}
              </p>
            </div>
          </div>

          {mode === "android" ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={dismiss} className="h-11 rounded-full border border-border text-sm font-medium text-foreground active:bg-muted">
                Not now
              </button>
              <button type="button" onClick={install} className="h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground active:bg-primary/90">
                Install
              </button>
            </div>
          ) : (
            <p className="mt-3.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] leading-snug text-foreground">
              Tap
              <HugeiconsIcon icon={ShareIcon} strokeWidth={2} aria-label="Share" className="h-4 w-4 shrink-0 text-primary" />
              in the browser bar, then <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
