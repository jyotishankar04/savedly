"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/arc/tag-input/tag-input";
import { BLOG_AUTHORS } from "@/lib/blog-authors";
import { MAX_TAGS, type Draft } from "./draft";

const label = "block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** About the post: its address, tags, author, date and cover address. */
export function DetailsPanel({
  draft,
  savedSlug,
  published,
  set,
  onSlugChange,
  onCoverAddressChange,
}: {
  draft: Draft;
  savedSlug: string;
  published: boolean;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onSlugChange: (slug: string) => void;
  onCoverAddressChange: (address: string) => void;
}) {
  return (
          <aside aria-label="Post details" className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <div>
              <label htmlFor="post-slug" className={label}>
                Address
              </label>
              <div className="mt-1.5 flex items-center rounded-md border border-input bg-input/20 text-sm focus-within:ring-2 focus-within:ring-ring/40">
                <span className="shrink-0 pl-2.5 text-muted-foreground">/blog/</span>
                <input
                  id="post-slug"
                  value={draft.slug}
                  onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="made-from-the-title"
                  maxLength={160}
                  className="h-9 min-w-0 flex-1 bg-transparent pr-2.5 font-mono text-[13px] outline-none"
                />
              </div>
              {published && draft.slug !== savedSlug && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Changing this breaks links to the post that are already out there.</p>}
            </div>

            <TagInput
              id="post-tags"
              label="Tags"
              value={draft.tags}
              onValueChange={(tags) => set("tags", tags.slice(0, MAX_TAGS))}
              placeholder="Add a tag"
              description={`Press Enter after each one. Up to ${MAX_TAGS}.`}
            />

            <div>
              <label htmlFor="post-author" className={label}>
                Author
              </label>
              {/* The three people a post can be by (lib/blog-authors.ts), plus an older post's own name if it isn't one of them. */}
              <Select
                items={Object.fromEntries([...BLOG_AUTHORS.map((a) => [a.name, a.role ? `${a.name}, ${a.role}` : a.name]), ...(BLOG_AUTHORS.some((a) => a.name === draft.authorName) ? [] : [[draft.authorName, draft.authorName]])])}
                value={draft.authorName}
                onValueChange={(v) => v && set("authorName", v as string)}
              >
                <SelectTrigger id="post-author" className="mt-1.5 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_AUTHORS.map((author) => (
                    <SelectItem key={author.name} value={author.name}>
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a small local picture */}
                        <img src={author.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                        {author.name}
                        {author.role && <span className="text-muted-foreground">{author.role}</span>}
                      </span>
                    </SelectItem>
                  ))}
                  {!BLOG_AUTHORS.some((a) => a.name === draft.authorName) && <SelectItem value={draft.authorName}>{draft.authorName}</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="post-date" className={label}>
                Date shown
              </label>
              <Input id="post-date" type="datetime-local" value={draft.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className="mt-1.5 text-sm" />
              <p className="mt-1 text-[11px] text-muted-foreground">{draft.publishedAt ? "In your own time zone." : "Left empty, it's the moment you publish."}</p>
            </div>

            <div>
              <label htmlFor="post-cover" className={label}>
                Cover image address
              </label>
              <Input
                id="post-cover"
                value={draft.coverImageUrl}
                onChange={(e) => onCoverAddressChange(e.target.value)}
                placeholder="https://… or /a-site-path"
                className="mt-1.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Filled in when you upload a cover. Wide images work best. Also used when the post is shared.</p>
            </div>
          </aside>
  );
}
