"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowExpand01Icon as Expand, ArrowShrink02Icon as Shrink } from "@hugeicons/core-free-icons";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteAiMenu, SELECTION_ACTIONS, type NoteAiMenuHandle } from "@/components/notes/note-ai-menu";
import { memoryQueryKey } from "@/context/MemoryContext";
import { updateMemory } from "@/lib/memories";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "editing" | "saving" | "error";

/**
 * Your note on a link or a file, written like a note in Notes: the editor is
 * always there, it saves by itself a moment after you stop, and Ctrl/⌘+Z
 * undoes. The ✨ menu and selected text's AI tools work as in Notes, and
 * "Open full page" gives it the whole screen for a longer note.
 */
export function MemoryNote({ memoryId, title, content }: { memoryId: string; title: string; content: string | null }) {
  const queryClient = useQueryClient();
  const editor = useRef<RichTextEditorHandle>(null);
  const aiMenu = useRef<NoteAiMenuHandle>(null);
  const [state, setState] = useState<SaveState>("saved");
  const [full, setFull] = useState(false);
  // The text the editor opens with (again, when it moves to full page and back), and whether there's any.
  const [openingText, setOpeningText] = useState(content ?? "");
  const [hasText, setHasText] = useState(!!content?.trim());
  // What's in the editor, and what the server last accepted.
  const latest = useRef(content ?? "");
  const saved = useRef(content ?? "");
  // The editor reports its text once on opening, as it writes it: that's the starting point, not an edit.
  const baselined = useRef(false);
  // Only the first opening sets what counts as saved; moving the editor to full page and back mustn't.
  const opened = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const again = useRef<() => void>(() => {});

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || latest.current === saved.current) return;
    saving.current = true;
    setState("saving");
    const markdown = latest.current;
    try {
      const updated = await updateMemory(memoryId, { content: markdown.trim() });
      saved.current = markdown;
      queryClient.setQueryData(memoryQueryKey(memoryId), updated);
      void queryClient.invalidateQueries({ queryKey: ["memories"] });
    } catch {
      saving.current = false;
      setState("error");
      return;
    }
    saving.current = false;
    if (latest.current !== saved.current) again.current();
    else setState("saved");
  }, [memoryId, queryClient]);
  useEffect(() => {
    again.current = () => void save();
  }, [save]);

  // Leaving with something unsaved: the browser asks first, and leaving within the app saves on the way out.
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (latest.current === saved.current && !saving.current) return;
      void save();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      void save();
    };
  }, [save]);

  // In and out of full page: the editor moves, and opens again on what's been written so far.
  const setFullPage = useCallback((open: boolean) => {
    baselined.current = false;
    setOpeningText(latest.current);
    setFull(open);
  }, []);

  // Full page: Esc comes back.
  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setFullPage(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [full, setFullPage]);

  const status = state === "saving" ? "Saving…" : state === "editing" ? "Editing" : state === "error" ? "Not saved" : hasText ? "Saved" : "";

  // One editor, inline or full page; moving it keeps what's written (it reopens on the latest text).
  const writer = (
    <NoteEditor
      key={full ? "full" : "inline"}
      ref={editor}
      markdown={openingText}
      autoFocus={full}
      size={full ? "page" : "compact"}
      placeholder="Why you saved this, or what to do with it. Type / for lists and to-dos"
      selectionActions={SELECTION_ACTIONS}
      onSelectionAction={(action, selection) =>
        aiMenu.current?.rewritePart(action as (typeof SELECTION_ACTIONS)[number]["id"], selection.markdown, (markdown) => editor.current?.replaceSelection(selection, markdown) ?? false, selection.context)
      }
      onChange={(value) => {
        setHasText(!value.empty);
        if (!baselined.current) {
          baselined.current = true;
          latest.current = value.markdown;
          if (!opened.current) saved.current = value.markdown;
          opened.current = true;
          return;
        }
        if (value.markdown === latest.current) return;
        latest.current = value.markdown;
        setState("editing");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(), 800);
      }}
      className={full ? undefined : "[&>[role=textbox]]:min-h-20"}
    />
  );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h2 className={cn("font-bold text-foreground", full ? "truncate text-sm" : "text-xs")}>{full ? title : "Your note"}</h2>
      <div className="flex shrink-0 items-center gap-1">
        <span aria-live="polite" className={cn("mr-1 text-[11px]", state === "error" ? "font-medium text-destructive" : "text-muted-foreground")}>
          {status}
        </span>
        {state === "error" && (
          <button type="button" onClick={() => void save()} className="mr-1 text-[11px] font-semibold text-foreground underline underline-offset-4">
            Try again
          </button>
        )}
        <NoteAiMenu
          ref={aiMenu}
          noteId={memoryId}
          getMarkdown={() => editor.current?.getMarkdown() ?? latest.current}
          onReplace={(markdown) => editor.current?.setMarkdown(markdown)}
          beforeRefresh={save}
        />
        <button
          type="button"
          onClick={() => setFullPage(!full)}
          aria-label={full ? "Back to the page" : "Open full page"}
          title={full ? "Back to the page (Esc)" : "Open full page"}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={full ? Shrink : Expand} strokeWidth={2} className="size-4" />
        </button>
      </div>
    </div>
  );

  if (full && typeof document !== "undefined") {
    return (
      <>
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-foreground">Your note</h2>
          <p className="rounded-2xl border border-dashed border-border px-4 py-3.5 text-xs text-muted-foreground">Open full page. Esc comes back.</p>
        </section>
        {createPortal(
          <div role="dialog" aria-modal="true" aria-label={`Your note on ${title}`} className="fixed inset-0 z-[90] overflow-y-auto bg-background animate-in fade-in-0 duration-150">
            <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5 sm:px-6 md:pt-8">
              <div className="mb-8">{header}</div>
              {writer}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <section className="space-y-2.5">
      {header}
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-sm leading-relaxed text-foreground transition-colors focus-within:border-primary/40">{writer}</div>
    </section>
  );
}
