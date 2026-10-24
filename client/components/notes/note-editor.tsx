"use client";

import { forwardRef } from "react";
import { RichTextEditor, markdownToHtml, type RichTextEditorHandle, type RichTextEditorProps } from "@/components/arc/rich-text-editor/rich-text-editor";
import { uploadFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/**
 * A note's text (Markdown) as the editor's HTML. Notes written before the
 * editor are plain text with line breaks, so a single line break stays one.
 */
export function noteHtml(markdown: string | null | undefined): string {
  return markdownToHtml(markdown ?? "", { breaks: true });
}

const uploadImage = async (file: File) => (await uploadFile(file)).fileUrl;

type NoteEditorProps = Omit<RichTextEditorProps, "value" | "defaultValue" | "defaultMarkdown" | "onUploadImage"> & {
  /** The note's text when the editor opens. Later changes to it aren't loaded: the editor owns the text while it's open. */
  markdown?: string | null;
  /** "page" for the full-page editor: larger text, and a tall area to click into. */
  size?: "compact" | "page";
};

/**
 * The editor notes are written in: the Arc rich text editor (headings, lists,
 * to-do lists, quotes, callouts, code, dividers, pictures, links; type / for
 * the menu), saving Markdown. Pictures pasted or dropped in are uploaded.
 */
export const NoteEditor = forwardRef<RichTextEditorHandle, NoteEditorProps>(function NoteEditor(
  { markdown, size = "compact", className, placeholder = "Write something, or type / for headings, lists and to-dos", ...props },
  ref,
) {
  return (
    <RichTextEditor
      ref={ref}
      defaultValue={noteHtml(markdown)}
      onUploadImage={uploadImage}
      placeholder={placeholder}
      aria-label="Note"
      className={cn(size === "page" ? "[--arc-text-base:1.0625rem] [&>[role=textbox]]:min-h-[50vh]" : "[&>[role=textbox]]:min-h-40", className)}
      {...props}
    />
  );
});

/** A note shown as it was written, formatted and read-only. */
export function NoteBody({ markdown, className }: { markdown: string | null | undefined; className?: string }) {
  return <RichTextEditor readOnly value={noteHtml(markdown)} aria-label="Note" className={cn("[&>[role=textbox]]:min-h-0", className)} />;
}
