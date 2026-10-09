"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useCurrentUserQuery } from "@/context/UserContext";

/**
 * The header and footer of the few public pages a self-hosted install keeps
 * (help, policies, contributing, shared links). No product navigation: the
 * marketing pages those links went to don't exist here.
 */
export function PlainNavbar() {
  const { data: user, isLoading } = useCurrentUserQuery();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-8" aria-label="Main">
        <Link href="/app" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <Logo className="text-[17px] text-foreground" />
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/help" className="text-muted-foreground transition-colors hover:text-foreground">
            Help
          </Link>
          {!isLoading && (
            <Link
              href={user ? "/app" : "/auth/login"}
              className="rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {user ? "Open app" : "Sign in"}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export function PlainFooter() {
  return (
    <footer className="border-t border-border/60 bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>
          A self-hosted install of{" "}
          <a href="https://savedly.app" target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-foreground hover:underline">
            Savedly
          </a>
          , open source under AGPL-3.0.
        </span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Footer">
          <Link href="/help" className="hover:text-foreground">
            Help
          </Link>
          <Link href="/contribute" className="hover:text-foreground">
            Contribute
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/** On a policy page: these describe the hosted service, not this install. Renders nothing on the hosted service. */
export function HostedPolicyNotice() {
  return (
    <p
      role="note"
      className="mx-auto mb-10 max-w-2xl rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground"
    >
      This install is run by its own operator. The policy below describes the hosted Savedly service at savedly.app, and may not apply here.
    </p>
  );
}
