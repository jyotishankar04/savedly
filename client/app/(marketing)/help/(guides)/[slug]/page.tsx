import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { StepImage } from "@/components/help/step-image";
import { GUIDES, categoryById, guideBySlug, guideNeighbors } from "@/lib/help-content";

// Every guide is prerendered; an unknown slug is a 404, never a runtime lookup.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  return guide ? { title: `${guide.title} · Help · SaveForLatter`, description: guide.summary } : {};
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const category = categoryById(guide.category);
  const { prev, next } = guideNeighbors(guide.slug);

  return (
    <article className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/help" className="hover:text-foreground transition-colors">
            Help Center
          </Link>
          <span aria-hidden>/</span>
          <span>{category?.title}</span>
        </nav>

        <h1 className="mt-5 text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] text-balance">{guide.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-[60ch]">{guide.intro}</p>

        {guide.actions && guide.actions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {guide.actions.map((action, i) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  i === 0
                    ? "inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    : "inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                }
              >
                {action.label}
                {i === 0 && <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />}
              </Link>
            ))}
          </div>
        )}

        <ol className="mt-12 space-y-10">
          {guide.steps.map((step, i) => (
            <li key={step.title} id={slugify(step.title)} className="scroll-mt-28 grid grid-cols-[1.25rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
              <span className="pt-1 text-sm font-medium tabular-nums text-muted-foreground">{i + 1}</span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{step.title}</h2>
                <p className="mt-2 text-base leading-7 text-muted-foreground max-w-[65ch]">{step.body}</p>
                {step.image && <StepImage src={step.image.src} alt={step.image.alt} />}
              </div>
            </li>
          ))}
        </ol>

        {/* Previous / next in reading order */}
        {(prev || next) && (
          <nav aria-label="More guides" className="mt-16 grid sm:grid-cols-2 gap-4 border-t border-border pt-8">
            {prev ? (
              <Link href={`/help/${prev.slug}`} className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={ArrowLeft} strokeWidth={2} className="h-3.5 w-3.5" />
                  Previous
                </span>
                <span className="mt-1 block text-[15px] font-medium group-hover:text-primary transition-colors">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/help/${next.slug}`} className="group rounded-xl border border-border p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40">
                <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  Next
                  <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block text-[15px] font-medium group-hover:text-primary transition-colors">{next.title}</span>
              </Link>
            )}
          </nav>
        )}

        <p className="mt-10 text-sm text-muted-foreground">
          Something missing or unclear?{" "}
          <Link href="/contact" className="text-primary hover:underline underline-offset-4">
            Tell us
          </Link>
          .
        </p>
    </article>
  );
}
