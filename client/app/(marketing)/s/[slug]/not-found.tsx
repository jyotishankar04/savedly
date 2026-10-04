import { HugeiconsIcon } from "@hugeicons/react";
import { CompassIcon as Compass } from "@hugeicons/core-free-icons";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";

/**
 * Shown for an unknown slug and, deliberately, for a link that has been
 * switched off, has expired, or whose contents were deleted — the API
 * returns an identical 404 for all of those so this page can't be used to
 * work out whether a given link ever existed.
 */
export default function ShareNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/[0.03] via-background to-background font-sans text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-32 pb-20">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-6 flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-card shadow-md">
              <HugeiconsIcon icon={Compass} strokeWidth={2.25} className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Link not available</h1>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            This link is invalid, or the owner has stopped sharing it.
          </p>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
