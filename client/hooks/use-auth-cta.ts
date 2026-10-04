"use client";

import { useCurrentUserQuery } from "@/context/UserContext";
import { ctaHref } from "@/lib/showcase";

/**
 * Every "Get started"/"Start free" CTA on the marketing site should behave
 * like the navbar already does: send a signed-in visitor straight to their
 * dashboard instead of back through signup. Centralized here so every
 * button (hero, final CTA, open-source section, etc.) stays consistent
 * with the navbar's own auth-aware logic instead of re-deriving it.
 */
export function useAuthCta(signupPath = "/auth/signup?plan=free") {
  const { data: currentUser, isLoading } = useCurrentUserQuery();
  const isAuthenticated = !!currentUser;

  return {
    isAuthenticated,
    isLoading,
    href: isAuthenticated ? "/app" : ctaHref(signupPath),
    label: isAuthenticated ? "Go to Dashboard" : "Start free",
  };
}
