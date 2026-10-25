"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageAdd01Icon as ImageAdd } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PostBody } from "@/components/blog/post-body";
import { MarkdownEditor } from "@/components/blog/markdown-editor";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import type { View } from "./draft";

/** The writing box: the visual editor, the Markdown source, or a preview of the post. */
export function WritingBox({
  view,
  onViewChange,
  words,
  uploadingImages,
  rich,
  richFill,
  content,
  onContentChange,
  onRichChange,
  onUploadImage,
  onUploadingImages,
}: {
  view: View;
  onViewChange: (view: View) => void;
  words: number;
  uploadingImages: number;
  rich: React.RefObject<RichTextEditorHandle | null>;
  richFill: { key: number; source: string; baseline: string };
  content: string;
  onContentChange: (content: string) => void;
  onRichChange: (markdown: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  onUploadingImages: (count: number) => void;
}) {
  return (
    <>
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2">
              <SegmentedControl
                label="View"
                value={view}
                onValueChange={(value) => onViewChange(value as View)}
                options={[
                  { value: "write", label: "Write" },
                  { value: "markdown", label: "Markdown" },
                  { value: "preview", label: "Preview" },
                ]}
              />
              <div className="flex items-center gap-3">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {words.toLocaleString()} {words === 1 ? "word" : "words"} · {Math.max(1, Math.ceil(words / 220))} min read
                </span>
                {view === "write" && (
                  <Button variant="outline" size="sm" disabled={uploadingImages > 0} onClick={() => rich.current?.pickImage()}>
                    <HugeiconsIcon icon={ImageAdd} strokeWidth={2} className="h-4 w-4" />
                    {uploadingImages > 0 ? "Uploading…" : "Add image"}
                  </Button>
                )}
              </div>
            </div>

            {view === "write" && (
              <div className="min-h-[max(26rem,calc(100svh-15rem))] cursor-text bg-background px-6 py-8 sm:px-10" onClick={(e) => e.target === e.currentTarget && rich.current?.focus()}>
                <RichTextEditor
                  key={richFill.key}
                  ref={rich}
                  aria-label="Post"
                  defaultMarkdown={richFill.source}
                  onChange={(value) => onRichChange(value.markdown)}
                  onUploadImage={onUploadImage}
                  onUploadState={({ uploading, error }) => {
                    onUploadingImages(uploading);
                    if (error) toast.add({ title: "Couldn't add the image.", description: error, type: "error" });
                  }}
                  placeholder="Start writing…"
                  blockHint="Type / for headings, lists and images"
                  className="mx-auto max-w-[44rem]"
                  style={{ "--arc-text-base": "17px" } as React.CSSProperties}
                />
              </div>
            )}

            {view === "markdown" && (
              <MarkdownEditor
                value={content}
                onChange={onContentChange}
                onUploadImage={onUploadImage}
                onUploadError={(message) => toast.add({ title: "Couldn't add the image.", description: message, type: "error" })}
                placeholder={"Write in Markdown: ## for a heading, **bold**, - for a list.\nPaste or drop an image to add it."}
                className="h-[max(26rem,calc(100svh-15rem))]"
              />
            )}

            {view === "preview" && (
              <div aria-label="Preview" className="min-h-[max(26rem,calc(100svh-15rem))] bg-background px-6 py-2 sm:px-10">
                {content.trim() ? <PostBody markdown={content} className="mx-auto max-w-[44rem]" /> : <p className="py-16 text-center text-sm text-muted-foreground">Nothing to preview yet.</p>}
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {view === "markdown"
              ? "The post as Markdown. Tables and other things the Write view can't show are safe here, but editing them in Write may drop them."
              : "Select text to format it or add a link. Type / on a new line for headings, lists, quotes and images. Paste or drop a picture to add it. Ctrl/⌘+S saves."}
          </p>
    </>
  );
}
