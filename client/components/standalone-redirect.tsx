"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Installed to a home screen, the site should behave like an app: it opens on
 * the app (the manifest's start_url), and anything that would land on the
 * marketing home page — signing out, a "back to home" link — goes to the app
 * instead, which sends a signed-out visitor on to sign-in.
 */
export function StandaloneRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's own flag for a home-screen web app.
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) router.replace("/app");
  }, [pathname, router]);

  return null;
}
