import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRightIcon } from "@hugeicons/core-free-icons";

// What a new person already has, and how each pile gets in. Every row is a
// real way in today (app/(platfrom)/app/import, integrations/github); nothing
// planned is listed.

const SOURCES = [
  {
    name: "Browser bookmarks",
    how: "Export them from Chrome, Firefox, Safari or Edge and upload the file.",
    detail: "bookmarks.html",
  },
  {
    name: "A list of links",
    how: "Paste them in, one per line. Handy for open tabs or a reading list kept in a note.",
    detail: "Paste",
  },
  {
    name: "GitHub stars",
    how: "Connect GitHub once. The repositories you've starred join your library, and new stars follow.",
    detail: "Connect",
  },
];

export function ImportSection() {
  return (
    <section id="import" className="scroll-mt-24 bg-background px-5 py-20 font-sans antialiased sm:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
        <div className="max-w-md">
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground">
            Start with what you already have
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
            Years of bookmarks don&apos;t have to stay behind. Bring them in, and each one is read, summarized and filed like anything else you save.
          </p>
          <Link
            href="/help/docs/get-started/import"
            className="group mt-7 inline-flex items-center gap-1.5 border-b border-foreground/25 pb-0.5 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            How importing works
            <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ul className="border-t border-foreground/15">
          {SOURCES.map((source) => (
            <li key={source.name} className="flex items-baseline justify-between gap-6 border-b border-foreground/15 py-6">
              <div>
                <h3 className="text-lg font-medium tracking-[-0.01em] text-foreground">{source.name}</h3>
                <p className="mt-1.5 max-w-md text-base leading-relaxed text-muted-foreground">{source.how}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{source.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
