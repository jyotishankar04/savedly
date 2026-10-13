"use client";

import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

/**
 * A post's Markdown, set for reading: a comfortable measure, generous line
 * height, and headings in the site's serif. The same component draws the
 * public post and the editor's preview, so what an admin sees is what
 * readers get.
 */
export function PostBody({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-[17px] leading-[1.75] text-foreground/90",
        "[&_p]:my-5 [&_p]:text-pretty",
        "[&_h1]:mt-12 [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-[2rem] [&_h1]:font-medium [&_h1]:leading-tight [&_h1]:tracking-[-0.02em] [&_h1]:text-foreground",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[1.7rem] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground",
        "[&_h3]:mt-9 [&_h3]:mb-2 [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-primary/50 [&_a]:underline-offset-4 hover:[&_a]:decoration-primary",
        "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5",
        "[&_blockquote]:my-7 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-5 [&_blockquote]:text-foreground [&_blockquote]:italic",
        "[&_img]:my-8 [&_img]:w-full [&_img]:rounded-2xl [&_img]:ring-1 [&_img]:ring-foreground/10",
        "[&_hr]:my-10 [&_hr]:border-foreground/15",
        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.88em]",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        className,
      )}
    >
      <Streamdown>{markdown}</Streamdown>
    </div>
  );
}
