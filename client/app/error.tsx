"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import { TriangleAlertIcon as TriangleAlert } from "@hugeicons/core-free-icons";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A page that crashed while rendering: report it (does nothing unless error tracking is set up).
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="relative w-14 h-14 flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-destructive/15 rounded-full blur-xl" />
        <div className="w-12 h-12 rounded-2xl border border-destructive/30 flex items-center justify-center bg-card shadow-md">
          <HugeiconsIcon icon={TriangleAlert} strokeWidth={2.25} className="h-6 w-6 text-destructive" />
        </div>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An unexpected error occurred. You can try again, or head back home.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="h-10 px-6 rounded-full bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/"
          className="h-10 px-6 rounded-full border border-border/60 hover:bg-muted text-xs font-semibold flex items-center transition-colors text-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
