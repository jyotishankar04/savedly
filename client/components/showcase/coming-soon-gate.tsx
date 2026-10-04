"use client";

import { usePathname } from "next/navigation";
import { ComingSoonPage } from "@/components/showcase/coming-soon-page";

// Everything else under (marketing) — /, /contribute, /features/*, /blog,
// etc. — is the showcase content and stays live.
const GATED_PREFIXES = ["/auth", "/app", "/admin", "/onboard"];

/**
 * Opt-in via NEXT_PUBLIC_SHOWCASE_MODE for a marketing-only deployment with
 * no backend hosted yet — everything except the marketing pages renders a
 * static "coming soon" placeholder instead of a real (and currently
 * non-functional) page. Leave the env var unset for a normal full-stack
 * deployment and this is a no-op.
 */
export function ComingSoonGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showcaseMode = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";
  const isGated = showcaseMode && GATED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isGated) {
    return <ComingSoonPage />;
  }

  return <>{children}</>;
}
