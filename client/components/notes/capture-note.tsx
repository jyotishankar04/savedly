"use client";

import { useRef, useState, type RefObject } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowExpand01Icon as Expand } from "@hugeicons/core-free-icons";
import { Input as ArcInput } from "@/components/arc/input/input";
import { Button as ArcButton } from "@/components/arc/button/button";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { CaptureCollectionPicker } from "@/components/capture/collection-picker";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { NoteEditor } from "@/components/notes/note-editor";
import { DuplicateSkippedError, useMemories } from "@/context/MemoryContext";
import { deriveTitle } from "@/lib/detect-memory-type";
import type { Collection, MemoryDetail } from "@/types/memory";

/** Where "Open full page" leaves the draft for the full-page editor (app/notes/new) to pick up. */
export const NOTE_DRAFT_KEY = "savedly:note-draft";
export interface NoteDraft {
  title: string;
  markdown: string;
  collectionIds: string[];
}

/**
 * The capture dialog's Note tab: a note written there and then, in the same
 * editor as the full page. "Open full page" carries the draft over to it.
 */
export function CaptureNote({
  collections,
  formRef,
  limit,
  onSaved,
  onOpenFullPage,
}: {
  collections: Collection[];
  /** The dialog's form ref, so the layout's Ctrl/⌘+Enter saves whichever tab is open. */
  formRef: RefObject<HTMLFormElement | null>;
  limit: { isAtLimit: boolean; message?: string | null };
  onSaved: (memory: MemoryDetail) => void;
  onOpenFullPage: (draft: NoteDraft) => void;
}) {
  const { create } = useMemories();
  const editor = useRef<RichTextEditorHandle>(null);
  const [title, setTitle] = useState("");
  const [empty, setEmpty] = useState(true);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const markdown = editor.current?.getMarkdown().trim() ?? "";
    if (!markdown || uploading || limit.isAtLimit) return;
    setSaving(true);
    setError(null);
    try {
      const memory = await create({
        type: "note",
        title: title.trim() || deriveTitle("note", editor.current?.getText() ?? markdown),
        content: markdown,
        collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
      });
      onSaved(memory);
    } catch (err) {
      if (!(err instanceof DuplicateSkippedError)) setError(err instanceof Error ? err.message : "Couldn't save the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <ArcInput label="Title" placeholder="Optional. The first line is used if you leave this empty" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">Note</span>
          <button
            type="button"
            onClick={() => onOpenFullPage({ title, markdown: editor.current?.getMarkdown() ?? "", collectionIds })}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Expand} strokeWidth={2} className="size-3.5" />
            Open full page
          </button>
        </div>
        {/* Scrolls inside itself, so a long note doesn't push Save out of the dialog. */}
        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-background px-3.5 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
          <NoteEditor
            ref={editor}
            autoFocus
            onChange={(value) => setEmpty(value.empty)}
            onUploadState={(state) => {
              setUploading(state.uploading);
              if (state.error) setError(state.error);
            }}
          />
        </div>
      </div>

      <CaptureCollectionPicker collections={collections} selectedIds={collectionIds} onChange={setCollectionIds} />

      {limit.isAtLimit ? (
        <PlanLimitNotice message={limit.message ?? "You've reached your memory limit."} />
      ) : (
        error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )
      )}

      <ArcButton type="submit" size="lg" loading={saving} disabled={empty || uploading > 0 || limit.isAtLimit} className="w-full">
        {limit.isAtLimit ? "Limit reached" : uploading > 0 ? "Uploading the picture…" : "Save note"}
      </ArcButton>
    </form>
  );
}
