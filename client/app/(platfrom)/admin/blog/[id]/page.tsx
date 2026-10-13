"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as Back, ImageUpload01Icon as ImageUpload, ViewIcon as Eye } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/uploads";
import { ApiError } from "@/lib/auth";
import { createBlogPost, getBlogPost, slugify, updateBlogPost, type BlogPost, type BlogPostInput } from "@/lib/blog";
import { PostBody } from "@/components/blog/post-body";

const MAX_EXCERPT = 400;
const MAX_TAGS = 8;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  /** Comma separated. */
  tags: string;
  authorName: string;
  /** For <input type="datetime-local">, in the admin's own time zone. Empty = set when published. */
  publishedAt: string;
}

const EMPTY: Draft = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", tags: "", authorName: "", publishedAt: "" };

/** An ISO time as <input type="datetime-local"> wants it, in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDraft(post: BlogPost): Draft {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? "",
    tags: post.tags.join(", "),
    authorName: post.authorName ?? "",
    publishedAt: toLocalInput(post.publishedAt),
  };
}

const parseTags = (text: string) => [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))];

/** What's wrong with the draft, in the admin's terms, or null. */
function problem(draft: Draft, isNew: boolean): string | null {
  if (!draft.title.trim()) return "Give the post a title.";
  if (!isNew && !SLUG_PATTERN.test(draft.slug)) return "The address can only have lowercase letters, numbers and hyphens.";
  if (isNew && draft.slug && !SLUG_PATTERN.test(draft.slug)) return "The address can only have lowercase letters, numbers and hyphens.";
  if (draft.excerpt.length > MAX_EXCERPT) return `The summary is over ${MAX_EXCERPT} characters.`;
  if (parseTags(draft.tags).length > MAX_TAGS) return `Use at most ${MAX_TAGS} tags.`;
  if (draft.coverImageUrl.trim() && !/^(https?:\/\/|\/(?!\/))/i.test(draft.coverImageUrl.trim())) return "The cover image must be an https:// address, or a path on this site starting with /";
  return null;
}

const label = "block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export default function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: post, isLoading, isError } = useQuery({ queryKey: ["admin", "blog", id], queryFn: () => getBlogPost(id), enabled: !isNew });

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saved, setSaved] = useState<Draft>(EMPTY);
  // Until the address is typed by hand, it follows the title.
  const [slugTouched, setSlugTouched] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState<null | "save" | "publish" | "unpublish">(null);
  const [uploading, setUploading] = useState<null | "cover" | "inline">(null);
  const body = useRef<HTMLTextAreaElement>(null);
  const loadedFor = useRef<string | null>(null);

  // Fill the form once per post, not on every refetch: a refetch mustn't wipe what's being typed.
  useEffect(() => {
    if (post && loadedFor.current !== post.id) {
      loadedFor.current = post.id;
      const next = toDraft(post);
      setDraft(next);
      setSaved(next);
      setSlugTouched(true);
    }
  }, [post]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const status = isNew ? "draft" : (post?.status ?? "draft");
  const published = status === "published";

  // Closing the tab with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setTitle = (title: string) => setDraft((d) => ({ ...d, title, slug: slugTouched ? d.slug : slugify(title) }));

  const payload = (): BlogPostInput => ({
    title: draft.title.trim(),
    ...(draft.slug ? { slug: draft.slug } : {}),
    excerpt: draft.excerpt.trim() || null,
    content: draft.content,
    coverImageUrl: draft.coverImageUrl.trim() || null,
    tags: parseTags(draft.tags),
    authorName: draft.authorName.trim() || null,
    ...(draft.publishedAt ? { publishedAt: new Date(draft.publishedAt).toISOString() } : {}),
  });

  const save = async (action: "save" | "publish" | "unpublish") => {
    const issue = problem(draft, isNew);
    if (issue) {
      toast.add({ title: issue, type: "error" });
      return;
    }
    if (action === "publish" && !draft.content.trim()) {
      toast.add({ title: "Write the post before publishing it.", type: "error" });
      return;
    }
    setSaving(action);
    try {
      const input = { ...payload(), ...(action === "publish" ? { status: "published" as const } : action === "unpublish" ? { status: "draft" as const } : {}) };
      const result = isNew ? await createBlogPost(input) : await updateBlogPost(id, input);
      const next = toDraft(result);
      setDraft(next);
      setSaved(next);
      queryClient.setQueryData(["admin", "blog", result.id], result);
      await queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: true });
      toast.add({
        title: action === "publish" ? "Published. It's on the website within a minute." : action === "unpublish" ? "Moved back to drafts." : "Saved.",
        type: "success",
      });
      if (isNew) {
        loadedFor.current = result.id;
        router.replace(`/admin/blog/${result.id}`);
      }
    } catch (err) {
      toast.add({ title: err instanceof ApiError ? err.message : "Couldn't save the post.", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  const upload = async (file: File, target: "cover" | "inline") => {
    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Choose an image file.", type: "error" });
      return;
    }
    setUploading(target);
    try {
      const { fileUrl } = await uploadFile(file);
      if (target === "cover") {
        set("coverImageUrl", fileUrl);
      } else {
        // Into the post where the cursor is, as Markdown.
        const el = body.current;
        const at = el ? el.selectionStart : draft.content.length;
        const snippet = `\n\n![${file.name.replace(/\.[^.]+$/, "")}](${fileUrl})\n\n`;
        set("content", draft.content.slice(0, at) + snippet + draft.content.slice(at));
      }
    } catch (err) {
      toast.add({ title: "Couldn't upload the image.", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setUploading(null);
    }
  };

  if (!isNew && isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (!isNew && (isError || !post)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground">That post doesn&apos;t exist any more.</p>
        <Link href="/admin/blog" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to all posts
        </Link>
      </div>
    );
  }

  const busy = saving !== null;
  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {/* Top bar: where you are, the post's state, and what you can do with it */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/blog" aria-label="Back to all posts" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <HugeiconsIcon icon={Back} strokeWidth={2} className="h-4 w-4" />
          </Link>
          <h1 className="truncate text-lg font-bold text-foreground">{isNew ? "New post" : "Edit post"}</h1>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              published ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
            )}
          >
            {published ? "Published" : "Draft"}
          </span>
          {dirty && <span className="shrink-0 text-[11px] text-amber-600 dark:text-amber-400">Unsaved changes</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {published && post && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-4 w-4" />
              View on the website
            </a>
          )}
          {published ? (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => save("unpublish")}>
                {saving === "unpublish" ? "Moving…" : "Unpublish"}
              </Button>
              <Button size="sm" disabled={busy || !dirty} onClick={() => save("save")}>
                {saving === "save" ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={busy || (!dirty && !isNew)} onClick={() => save("save")}>
                {saving === "save" ? "Saving…" : "Save draft"}
              </Button>
              <Button size="sm" disabled={busy} onClick={() => save("publish")}>
                {saving === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* The post */}
        <div className="min-w-0 space-y-4">
          <div>
            <label htmlFor="post-title" className={label}>
              Title
            </label>
            <Input id="post-title" value={draft.title} onChange={(e) => setTitle(e.target.value)} placeholder="What the post is called" maxLength={200} className="mt-1.5 h-11 text-base font-medium" />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div role="tablist" aria-label="Post" className="inline-flex rounded-lg bg-muted p-1 text-xs font-medium">
                {(["write", "preview"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className={cn("rounded-md px-3 py-1.5 capitalize transition-colors", view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {words.toLocaleString()} {words === 1 ? "word" : "words"} · {Math.max(1, Math.ceil(words / 220))} min read
                </span>
                <label className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary", uploading && "pointer-events-none opacity-60")}>
                  <HugeiconsIcon icon={ImageUpload} strokeWidth={2} className="h-4 w-4" />
                  {uploading === "inline" ? "Uploading…" : "Add image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(file, "inline");
                    }}
                  />
                </label>
              </div>
            </div>

            {view === "write" ? (
              <Textarea
                ref={body}
                aria-label="Post, in Markdown"
                value={draft.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder={"Write in Markdown.\n\n## A heading\n\nA paragraph with **bold**, *italic* and a [link](https://savedly.app).\n\n- A list\n- Of points"}
                className="mt-2 min-h-[32rem] resize-y font-mono text-[13px] leading-relaxed"
              />
            ) : (
              <div className="mt-2 min-h-[32rem] rounded-lg border border-border bg-background px-5 py-4 sm:px-8">
                {draft.content.trim() ? <PostBody markdown={draft.content} /> : <p className="py-10 text-center text-sm text-muted-foreground">Nothing to preview yet.</p>}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">Markdown: # for headings, **bold**, *italic*, [text](address) for links, &gt; for a quote, ``` for code.</p>
          </div>
        </div>

        {/* About the post */}
        <aside className="space-y-5">
          <div>
            <label htmlFor="post-slug" className={label}>
              Address
            </label>
            <div className="mt-1.5 flex items-center rounded-md border border-input bg-transparent text-sm focus-within:ring-2 focus-within:ring-ring/40">
              <span className="shrink-0 pl-3 text-muted-foreground">/blog/</span>
              <input
                id="post-slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                placeholder="made-from-the-title"
                maxLength={160}
                className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] outline-none"
              />
            </div>
            {published && draft.slug !== saved.slug && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Changing this breaks links to the post that are already out there.</p>}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="post-excerpt" className={label}>
                Summary
              </label>
              <span className={cn("text-[11px] tabular-nums", draft.excerpt.length > MAX_EXCERPT ? "text-destructive" : "text-muted-foreground")}>
                {draft.excerpt.length}/{MAX_EXCERPT}
              </span>
            </div>
            <Textarea id="post-excerpt" value={draft.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="One or two sentences. Shown in the post list, link previews and search results." className="mt-1.5 min-h-[5.5rem] text-sm" />
          </div>

          <div>
            <span className={label}>Cover image</span>
            {draft.coverImageUrl.trim() ? (
              <div className="mt-1.5 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host */}
                <img src={draft.coverImageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
              </div>
            ) : null}
            <Input aria-label="Cover image address" value={draft.coverImageUrl} onChange={(e) => set("coverImageUrl", e.target.value)} placeholder="https://…, /a-site-path, or upload one" className="mt-1.5 text-sm" />
            <div className="mt-1.5 flex items-center gap-3">
              <label className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary", uploading && "pointer-events-none opacity-60")}>
                <HugeiconsIcon icon={ImageUpload} strokeWidth={2} className="h-4 w-4" />
                {uploading === "cover" ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(file, "cover");
                  }}
                />
              </label>
              {draft.coverImageUrl && (
                <button type="button" onClick={() => set("coverImageUrl", "")} className="text-xs text-muted-foreground hover:text-foreground">
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Wide images work best (16:9). Also used when the post is shared.</p>
          </div>

          <div>
            <label htmlFor="post-tags" className={label}>
              Tags
            </label>
            <Input id="post-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} placeholder="engineering, product" className="mt-1.5 text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">Separated by commas, up to {MAX_TAGS}.</p>
          </div>

          <div>
            <label htmlFor="post-author" className={label}>
              Author
            </label>
            <Input id="post-author" value={draft.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="Your name, if left empty" maxLength={120} className="mt-1.5 text-sm" />
          </div>

          <div>
            <label htmlFor="post-date" className={label}>
              Date shown
            </label>
            <Input id="post-date" type="datetime-local" value={draft.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className="mt-1.5 text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">{draft.publishedAt ? "In your own time zone." : "Left empty, it's the moment you publish."}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
