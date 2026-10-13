"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon as Plus, Delete02Icon as Trash, PencilEdit02Icon as Pencil, ViewIcon as Eye } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Badge } from "@/components/arc/badge/badge";
import { deleteBlogPost, formatPostDate, listBlogPosts, type BlogPostSummary } from "@/lib/blog";

type Filter = "all" | "published" | "draft";

const Count = ({ n }: { n: number }) => <span className="tabular-nums text-muted-foreground">{n}</span>;

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading, isError } = useQuery({ queryKey: ["admin", "blog"], queryFn: listBlogPosts });
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<BlogPostSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = { all: posts.length, published: posts.filter((p) => p.status === "published").length, draft: posts.filter((p) => p.status === "draft").length };
  const shown = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const confirmDelete = async () => {
    if (!toDelete) return;
    const post = toDelete;
    setToDelete(null);
    setBusy(true);
    try {
      await deleteBlogPost(post.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "blog"] });
      toast.add({ title: "Post deleted.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't delete the post.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-lg font-bold text-foreground">Blog</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Posts for the public blog at /blog. A draft is visible only here. A published post appears on the website within a minute.
          </p>
        </div>
        <Link href="/admin/blog/new" className={buttonVariants({ size: "sm" })}>
          <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
          New post
        </Link>
      </div>

      <SegmentedControl
        label="Show"
        value={filter}
        onValueChange={(value) => setFilter(value as Filter)}
        options={[
          { value: "all", label: "All", accessory: <Count n={counts.all} /> },
          { value: "published", label: "Published", accessory: <Count n={counts.published} /> },
          { value: "draft", label: "Drafts", accessory: <Count n={counts.draft} /> },
        ]}
        className="w-fit"
      />

      <section aria-label="Posts" className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {isError && <p className="text-xs text-destructive">Couldn&apos;t load the posts.</p>}
        {!isLoading && !isError && posts.length === 0 && (
          <EmptyState
            title="No posts yet"
            description="The public blog shows a short note until the first post is published."
            action={
              <Link href="/admin/blog/new" className={buttonVariants({ size: "sm" })}>
                Write the first one
              </Link>
            }
          />
        )}
        {!isLoading && posts.length > 0 && shown.length === 0 && <p className="text-xs text-muted-foreground">Nothing here.</p>}

        {shown.map((post) => (
          <div key={post.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              {post.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host
                <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/admin/blog/${post.id}`} className="block truncate text-sm font-medium text-foreground hover:underline">
                {post.title}
              </Link>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                /blog/{post.slug}
                {post.status === "published" ? ` · ${formatPostDate(post.publishedAt)}` : ` · edited ${formatPostDate(post.updatedAt)}`}
                {` · ${post.readingMinutes} min read`}
              </p>
            </div>

            <Badge tone={post.status === "published" ? "success" : "neutral"} size="sm" className="shrink-0">
              {post.status === "published" ? "Published" : "Draft"}
            </Badge>

            <div className="flex shrink-0 items-center gap-1">
              {post.status === "published" && (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View "${post.title}" on the website`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                  <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-4 w-4" />
                </a>
              )}
              <Link href={`/admin/blog/${post.id}`} aria-label={`Edit "${post.title}"`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <HugeiconsIcon icon={Pencil} strokeWidth={2} className="h-4 w-4" />
              </Link>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete "${post.title}"`} disabled={busy} onClick={() => setToDelete(post)}>
                <HugeiconsIcon icon={Trash} strokeWidth={2} className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.title}&rdquo; will be removed for good{toDelete?.status === "published" ? ", and its address on the website will stop working" : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
