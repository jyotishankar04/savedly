"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as Back, Settings02Icon as SettingsIcon, ViewIcon as Eye } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/arc/badge/badge";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/lib/blog";
import type { SaveAction } from "./draft";

/** Stays in view while writing: where you are, the post's state, and what you can do with it */
export function EditorToolbar({
  published,
  post,
  dirty,
  isNew,
  saving,
  saveState,
  showSettings,
  onToggleSettings,
  onSave,
}: {
  published: boolean;
  post: BlogPost | undefined;
  dirty: boolean;
  isNew: boolean;
  saving: SaveAction | null;
  saveState: string;
  showSettings: boolean;
  onToggleSettings: () => void;
  onSave: (action: SaveAction) => void;
}) {
  const busy = saving !== null;
  return (
      <div className="sticky top-0 z-20 -mx-6 -mt-8 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/blog" aria-label="Back to all posts" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <HugeiconsIcon icon={Back} strokeWidth={2} className="h-4 w-4" />
          </Link>
          <Badge tone={published ? "success" : "neutral"} size="sm" className="shrink-0">
            {published ? "Published" : "Draft"}
          </Badge>
          <span role="status" className={cn("truncate text-xs", dirty && saving !== "save" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {saveState}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {published && post && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-4 w-4" />
              View on the website
            </a>
          )}
          <Button variant={showSettings ? "secondary" : "ghost"} size="sm" aria-pressed={showSettings} onClick={onToggleSettings}>
            <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} className="h-4 w-4" />
            Details
          </Button>
          {published ? (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onSave("unpublish")}>
                {saving === "unpublish" ? "Moving…" : "Unpublish"}
              </Button>
              <Button size="sm" disabled={busy || !dirty} onClick={() => onSave("save")}>
                {saving === "save" ? "Saving…" : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={busy || (!dirty && !isNew)} onClick={() => onSave("save")}>
                {saving === "save" ? "Saving…" : "Save draft"}
              </Button>
              <Button size="sm" disabled={busy} onClick={() => onSave("publish")}>
                {saving === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>
  );
}
