"use client";

import { useRef, useState, type RefObject } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon as ChevronDown, ArrowExpand01Icon as Expand, Layers01Icon as Layers } from "@hugeicons/core-free-icons";
import { Button as ArcButton } from "@/components/arc/button/button";
import { formatShortcut, usePlatform } from "@/components/arc/shortcut-recorder/shortcut-recorder";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { CaptureCollectionPicker } from "@/components/capture/collection-picker";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { NoteEditor } from "@/components/notes/note-editor";
import { DuplicateSkippedError, useMemories } from "@/context/MemoryContext";
import { deriveTitle } from "@/lib/detect-memory-type";
import { cn } from "@/lib/utils";
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
  // Collections stay folded away until wanted: the note is the point here.
  const [showCollections, setShowCollections] = useState(false);
  const platform = usePlatform();
  const chosen = collections.filter((c) => collectionIds.includes(c.id));

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
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      {/* One writing surface, like a small page: the title, then the note. */}
      <div className="rounded-2xl border border-border/70 bg-muted/25 transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
        <label htmlFor="capture-note-title" className="sr-only">
          Title
        </label>
        <input
          id="capture-note-title"
          value={title}
          maxLength={500}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor.current?.focus();
            }
          }}
          placeholder="Untitled"
          autoComplete="off"
          className="block w-full bg-transparent px-5 pb-1 pt-4 text-xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/45"
        />
        {/* Grows with the note; the dialog scrolls past a long one. Not a scrolling box of its own: that would clip the / menu. */}
        <div className="px-5 pb-4">
          <NoteEditor
            ref={editor}
            autoFocus
            placeholder="Start writing. Type / for headings, lists and to-dos"
            onChange={(value) => setEmpty(value.empty)}
            onUploadState={(state) => {
              setUploading(state.uploading);
              if (state.error) setError(state.error);
            }}
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          aria-expanded={showCollections}
          onClick={() => setShowCollections((open) => !open)}
          className="-ml-2 inline-flex max-w-full items-center gap-2 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Layers} strokeWidth={2} className="size-4 shrink-0" />
          <span className="truncate">{chosen.length ? chosen.map((c) => c.name).join(", ") : "Add to a collection"}</span>
          <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className={cn("size-3.5 shrink-0 transition-transform", showCollections && "rotate-180")} />
        </button>
        {showCollections && (
          <div className="mt-3">
            <CaptureCollectionPicker collections={collections} selectedIds={collectionIds} onChange={setCollectionIds} hideLegend />
          </div>
        )}
      </div>

      {limit.isAtLimit ? (
        <PlanLimitNotice message={limit.message ?? "You've reached your memory limit."} />
      ) : (
        error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={() => onOpenFullPage({ title, markdown: editor.current?.getMarkdown() ?? "", collectionIds })}
          className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Expand} strokeWidth={2} className="size-4" />
          Open full page
        </button>
        <div className="flex items-center gap-3">
          <kbd className="hidden font-sans text-xs text-muted-foreground sm:inline">{formatShortcut("mod+enter", platform).text}</kbd>
          <ArcButton type="submit" loading={saving} disabled={empty || uploading > 0 || limit.isAtLimit}>
            {limit.isAtLimit ? "Limit reached" : uploading > 0 ? "Uploading the picture…" : "Save note"}
          </ArcButton>
        </div>
      </div>
    </form>
  );
}
