import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { GlobeIcon as Globe, Folder01Icon as Folder } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { readableFields } from "@/lib/extracted-fields";
import type { MemoryDetail } from "@/types/memory";
import { formatSavedDate, hostOf, TYPE_META } from "./helpers";

/** Right: what Savedly made of it */
export function UnderstandingPanel({
  memory,
  meta,
  processing,
}: {
  memory: MemoryDetail;
  meta: (typeof TYPE_META)[keyof typeof TYPE_META];
  processing: boolean;
}) {
  // Short facts the AI pulled out (a date, a price, a project name) — not
  // long restatements, and nothing that just repeats the note itself.
  const details = readableFields(memory.extractedFields, [memory.content, memory.title]);

  return (
        <aside className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <LogoMark ticks={false} className="h-4 w-4" />
            <h2 className="text-xs font-bold text-foreground">What Savedly understood</h2>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[10px] font-semibold text-muted-foreground">Summary</h3>
            <p className="text-xs leading-relaxed text-foreground/90">
              {memory.description ||
                (processing ? "Still reading this. The summary appears here in a few seconds." : "No summary for this one.")}
            </p>
          </div>

          {memory.webResearch && memory.webResearch.sources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">Looked up on the web</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The note alone didn&apos;t say what this is, so Savedly searched for &ldquo;{memory.webResearch.query}&rdquo;.
              </p>
              <div className="flex flex-col gap-1">
                {memory.webResearch.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    <HugeiconsIcon icon={Globe} strokeWidth={2} className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{source.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{hostOf(source.url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground">Tags</h3>
            {memory.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/app/tags/${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{processing ? "Coming up…" : "No tags yet."}</p>
            )}
          </div>

          {memory.collections.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">In collections</h3>
              <div className="flex flex-col gap-1">
                {memory.collections.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/app/collections/${collection.id}`}
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <HugeiconsIcon icon={Folder} strokeWidth={2} className="h-4 w-4 text-primary" />
                    <span className="truncate">{collection.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {details.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {details.map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-xs font-medium text-foreground break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="border-t border-border/50 pt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Saved</p>
              <p className="mt-0.5 font-medium text-foreground">{formatSavedDate(memory.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Type</p>
              <p className="mt-0.5 font-medium text-foreground">{meta.label}</p>
            </div>
          </div>
        </aside>
  );
}
