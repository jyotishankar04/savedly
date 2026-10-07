import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon as Rocket } from "@hugeicons/core-free-icons";
import { SquigglyText } from "@/components/ui/squiggly-text";

/**
 * Static, backend-free placeholder for the marketing-only showcase
 * deployment (see ComingSoonGate) — deliberately makes no API calls, since
 * this deployment has no backend to reach.
 */
export function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background">
      <div className="relative w-14 h-14 flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
        <div className="w-12 h-12 flex items-center justify-center">
          <HugeiconsIcon icon={Rocket} strokeWidth={2.25} className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          We&apos;re <SquigglyText scale={[3, 6]} stepDuration={90} className="text-primary">building</SquigglyText> this
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This part of Savedly isn&apos;t live in this preview yet. Take a look around the rest of the site in the meantime.
        </p>
      </div>

      <Link
        href="/waitlist"
        className="mt-8 h-10 px-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 transition-colors"
      >
        Join waitlist
      </Link>
    </div>
  );
}
