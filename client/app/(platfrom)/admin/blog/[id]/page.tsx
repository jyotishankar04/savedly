"use client";

import React, { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/uploads";
import { ApiError } from "@/lib/auth";
import { createBlogPost, getBlogPost, slugify, updateBlogPost, type BlogPostInput } from "@/lib/blog";
import { htmlToMarkdown, markdownToHtml, type RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { CoverField } from "@/components/blog/editor/cover-field";
import { DetailsPanel } from "@/components/blog/editor/details-panel";
import { EMPTY, MAX_EXCERPT, problem, toDraft, type Draft, type SaveAction, type View } from "@/components/blog/editor/draft";
import { EditorToolbar } from "@/components/blog/editor/editor-toolbar";
import { WritingBox } from "@/components/blog/editor/writing-box";

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
  const [view, setView] = useState<View>("write");
  const [showSettings, setShowSettings] = useState(true);
  const [saving, setSaving] = useState<null | SaveAction>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const rich = useRef<RichTextEditorHandle>(null);
  const [uploadingImages, setUploadingImages] = useState(0);
  // The visual editor is filled once, when it appears: on load, and on coming
  // back from the Markdown view. `source` is the Markdown it was filled with
  // and `baseline` what that reads back as, so that opening a post and
  // touching nothing doesn't count as a change (the editor writes "_italic_"
  // where the post may say "*italic*").
  const [richFill, setRichFill] = useState({ key: 0, source: "", baseline: "" });
  const fillRich = (source: string) => setRichFill((prev) => ({ key: prev.key + 1, source, baseline: htmlToMarkdown(markdownToHtml(source)) }));
  const loadedFor = useRef<string | null>(null);

  // Fill the form once per post, not on every refetch: a refetch mustn't wipe what's being typed.
  useEffect(() => {
    if (post && loadedFor.current !== post.id) {
      loadedFor.current = post.id;
      const next = toDraft(post);
      setDraft(next);
      setSaved(next);
      setSlugTouched(true);
      fillRich(next.content);
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

  const save = async (action: SaveAction) => {
    if (saving) return;
    const issue = problem(draft, isNew);
    if (issue) {
      // Something to put right, not something that went wrong.
      toast.warning(issue);
      return;
    }
    if (action === "publish" && !draft.content.trim()) {
      toast.warning("Write the post before publishing it.");
      return;
    }
    setSaving(action);
    // Publishing and unpublishing show their progress as one toast that turns
    // into the result. A plain save says so in the bar at the top instead.
    const progress = action === "publish" ? toast.loading("Publishing") : action === "unpublish" ? toast.loading("Moving back to drafts") : null;
    try {
      const input: BlogPostInput = {
        title: draft.title.trim(),
        // An address nobody typed is left for the server to choose, so a second
        // post with the same title gets "-2" instead of being refused.
        ...(draft.slug && (slugTouched || !isNew) ? { slug: draft.slug } : {}),
        excerpt: draft.excerpt.trim() || null,
        content: draft.content,
        coverImageUrl: draft.coverImageUrl.trim() || null,
        tags: draft.tags,
        authorName: draft.authorName.trim() || null,
        ...(draft.publishedAt ? { publishedAt: new Date(draft.publishedAt).toISOString() } : {}),
        ...(action === "publish" ? { status: "published" as const } : action === "unpublish" ? { status: "draft" as const } : {}),
      };
      const result = isNew ? await createBlogPost(input) : await updateBlogPost(id, input);
      const next = toDraft(result);
      setDraft(next);
      setSaved(next);
      setSavedAt(new Date());
      queryClient.setQueryData(["admin", "blog", result.id], result);
      await queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: true });
      if (progress) {
        toast.update(
          progress,
          action === "publish"
            ? {
                type: "success",
                title: "Published",
                description: "It's on the website within a minute.",
                action: { label: "View", onClick: () => window.open(`/blog/${result.slug}`, "_blank", "noopener") },
              }
            : { type: "info", title: "Moved back to drafts", description: "It's no longer on the website." },
        );
      }
      if (isNew) {
        loadedFor.current = result.id;
        router.replace(`/admin/blog/${result.id}`);
      }
    } catch (err) {
      const failed = { type: "error" as const, title: "Couldn't save the post", description: err instanceof ApiError ? err.message : undefined };
      if (progress) toast.update(progress, failed);
      else toast.add(failed);
    } finally {
      setSaving(null);
    }
  };

  // Ctrl+S / ⌘S saves, from anywhere on the page. Reads the newest `save` through a ref.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current("save");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const uploadImage = async (file: File) => (await uploadFile(file)).fileUrl;

  const uploadCover = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Choose an image file.", type: "error" });
      return;
    }
    setCoverBusy(true);
    try {
      set("coverImageUrl", await uploadImage(file));
      setCoverBroken(false);
    } catch (err) {
      toast.add({ title: "Couldn't upload the image.", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setCoverBusy(false);
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

  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const cover = draft.coverImageUrl.trim();
  const saveState = saving === "save" ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : isNew ? "" : "All changes saved";

  return (
    <div>
      <EditorToolbar
        published={published}
        post={post}
        dirty={dirty}
        isNew={isNew}
        saving={saving}
        saveState={saveState}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        onSave={save}
      />

      <div className={cn("grid gap-8", showSettings && "xl:grid-cols-[minmax(0,1fr)_17rem]")}>
        {/* The post, laid out the way it will read */}
        <div className="min-w-0">
          <CoverField cover={cover} broken={coverBroken} busy={coverBusy} onBroken={() => setCoverBroken(true)} onUpload={uploadCover} onRemove={() => set("coverImageUrl", "")} />

          {/* Title and summary, in the type they'll be read in */}
          <textarea
            aria-label="Title"
            value={draft.title}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("post-excerpt")?.focus();
              }
            }}
            placeholder="Title"
            maxLength={200}
            rows={1}
            autoFocus={isNew}
            className="block field-sizing-content w-full resize-none bg-transparent font-serif text-[2.5rem] leading-[1.1] font-medium tracking-[-0.025em] text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          <textarea
            id="post-excerpt"
            aria-label="Summary"
            value={draft.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="A one or two sentence summary. Shown under the title, in the post list and when the post is shared."
            rows={1}
            className="mt-3 block field-sizing-content w-full resize-none bg-transparent text-lg leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50"
          />
          {draft.excerpt.length > MAX_EXCERPT - 60 && (
            <p className={cn("mt-1 text-[11px] tabular-nums", draft.excerpt.length > MAX_EXCERPT ? "text-destructive" : "text-muted-foreground")}>
              {draft.excerpt.length}/{MAX_EXCERPT}
            </p>
          )}

          <WritingBox
            view={view}
            onViewChange={(next) => {
              // Coming back to the visual editor, it takes whatever the Markdown now says.
              if (next === "write" && view !== "write") fillRich(draft.content);
              setView(next);
            }}
            words={words}
            uploadingImages={uploadingImages}
            rich={rich}
            richFill={richFill}
            content={draft.content}
            onContentChange={(content) => set("content", content)}
            onRichChange={(markdown) => {
              // Untouched (or undone back to how it was filled): keep the post's own Markdown.
              const content = markdown === richFill.baseline ? richFill.source : markdown;
              setDraft((d) => (d.content === content ? d : { ...d, content }));
            }}
            onUploadImage={uploadImage}
            onUploadingImages={setUploadingImages}
          />
        </div>

        {showSettings && (
          <DetailsPanel
            draft={draft}
            savedSlug={saved.slug}
            published={published}
            set={set}
            onSlugChange={(slug) => {
              setSlugTouched(true);
              set("slug", slug);
            }}
            onCoverAddressChange={(address) => {
              setCoverBroken(false);
              set("coverImageUrl", address);
            }}
          />
        )}
      </div>
    </div>
  );
}
