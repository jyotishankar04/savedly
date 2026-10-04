"use client";

import { useEffect } from "react";

/** Registers public/sw.js, which receives files and links shared to the installed app. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sharing into the app won't carry files; everything else works without it.
    });
  }, []);

  return null;
}
