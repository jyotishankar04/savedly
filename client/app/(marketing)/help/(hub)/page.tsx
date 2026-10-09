import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, Bug01Icon as Bug, Mail01Icon as Mail, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { CATEGORIES, docsCategoryHref } from "@/lib/help-content";
import { hostedHref } from "@/lib/instance";

export const metadata: Metadata = {
  title: "Help Center · Savedly",
  description: "Step-by-step guides for every Savedly feature, plus a live model chooser for picking your AI models.",
};

export default function HelpHubPage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Lead: one question, one primary path into the guides; the model chooser sits beside it */}
      <header className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-x-20 gap-y-12 lg:items-end">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.08] text-balance">How can we help?</h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
            Step-by-step guides for every feature, with screenshots, and a live tool for choosing your AI models.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/help/docs"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            >
              <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-4 w-4" />
              Browse the guides
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/help/docs/get-started/getting-started" className="font-medium text-primary hover:underline underline-offset-4">
              Start with &ldquo;Getting started&rdquo;
            </Link>
          </p>
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

      {/* Topics: one row each, linking into the docs space */}
      <ul className="mt-20 divide-y divide-border border-t border-border">
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link
              href={docsCategoryHref(category.id)}
              className="group flex items-center justify-between gap-6 py-6 -mx-3 px-3 rounded-lg transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="min-w-0">
                <span className="block text-[17px] font-medium text-foreground group-hover:text-primary transition-colors">{category.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground leading-snug">{category.blurb}</span>
              </span>
              <HugeiconsIcon
                icon={ArrowRight}
                strokeWidth={2}
                className="h-4 w-4 shrink-0 text-muted-foreground/0 -translate-x-1 transition-all group-hover:text-primary group-hover:translate-x-0 group-focus-visible:text-primary group-focus-visible:translate-x-0"
              />
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="still-stuck" className="mt-12 grid md:grid-cols-[16rem_minmax(0,1fr)] gap-x-10 gap-y-4 border-t border-border pt-9 pb-16">
        <div>
          <h2 id="still-stuck" className="text-base font-semibold">
            Still stuck?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">We read every message.</p>
        </div>
        <ul className="flex flex-col sm:flex-row gap-x-10 gap-y-3 text-[15px]">
          <li>
            <Link href={hostedHref("/contact")} className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors">
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
  );
}
