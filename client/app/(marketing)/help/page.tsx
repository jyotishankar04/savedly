import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, Bug01Icon as Bug, Mail01Icon as Mail } from "@hugeicons/core-free-icons";
import { HelpSearch } from "@/components/help/help-search";
import { HelpHashRedirect } from "@/components/help/hash-redirect";
import { entriesByCategory, entryHref, guideBySlug } from "@/lib/help-content";

export const metadata: Metadata = {
  title: "Help Center · SaveForLatter",
  description: "Guides for every SaveForLatter feature, plus a live model chooser for picking your AI models.",
};

export default function HelpHubPage() {
  const groups = entriesByCategory();
  const start = guideBySlug("getting-started");

  return (
    <div className="max-w-6xl mx-auto px-6">
      <HelpHashRedirect />

      {/* Lead: one question, one control; the model chooser sits beside it */}
      <header className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-x-20 gap-y-12 lg:items-end">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.08] text-balance">How can we help?</h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
            Step-by-step guides for every feature, and a live tool for choosing your AI models.
          </p>
          <div className="mt-8">
            <HelpSearch />
          </div>
          {start && (
            <p className="mt-5 text-sm text-muted-foreground">
              New here?{" "}
              <Link href={entryHref(start)} className="font-medium text-primary hover:underline underline-offset-4">
                Start with &ldquo;{start.title}&rdquo;
              </Link>
            </p>
          )}
        </div>

        <section aria-labelledby="tool-model" className="rounded-2xl border border-border bg-muted/30 p-6">
          <h2 id="tool-model" className="text-lg font-semibold leading-snug">
            Not sure which AI models to use?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Pick what matters to you (cost, speed, quality) and get a model for each job, with live prices for hundreds of models from every provider.
          </p>
          <Link
            href="/help/model-selection"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
          >
            Choose your models
            <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
          </Link>
        </section>
      </header>

      {/* Topic index: typographic, divided by hairlines */}
      <div className="mt-20 divide-y divide-border border-t border-border">
        {groups.map(({ category, entries }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="grid md:grid-cols-[16rem_minmax(0,1fr)] gap-x-10 gap-y-4 py-9">
            <div>
              <h2 id={`cat-${category.id}`} className="text-base font-semibold text-foreground">
                {category.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{category.blurb}</p>
            </div>
            <ul className="-my-2 grid sm:grid-cols-2 sm:gap-x-8">
              {entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={entryHref(entry)}
                    className="group flex items-start justify-between gap-4 rounded-lg -mx-3 px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors">{entry.title}</span>
                        {entry.kind === "tool" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Tool</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground leading-snug">{entry.summary}</span>
                    </span>
                    <HugeiconsIcon
                      icon={ArrowRight}
                      strokeWidth={2}
                      className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/0 -translate-x-1 transition-all group-hover:text-primary group-hover:translate-x-0 group-focus-visible:text-primary group-focus-visible:translate-x-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="still-stuck" className="grid md:grid-cols-[16rem_minmax(0,1fr)] gap-x-10 gap-y-4 py-9">
          <div>
            <h2 id="still-stuck" className="text-base font-semibold">
              Still stuck?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-snug">We read every message.</p>
          </div>
          <ul className="flex flex-col sm:flex-row gap-x-10 gap-y-3 text-[15px]">
            <li>
              <Link href="/contact" className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
                <HugeiconsIcon icon={Mail} strokeWidth={2} className="h-4 w-4" />
                Ask us a question
              </Link>
            </li>
            <li>
              <Link href="/report" className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
                <HugeiconsIcon icon={Bug} strokeWidth={2} className="h-4 w-4" />
                Report a bug or request a feature
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
