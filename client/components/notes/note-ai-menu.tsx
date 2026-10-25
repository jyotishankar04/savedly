"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowShrink02Icon as Shorter,
  Loading03Icon as Spinner,
  MagicWand01Icon as Improve,
  RefreshIcon as Refresh,
  SparklesIcon as Sparkles,
  TextCheckIcon as Fix,
} from "@hugeicons/core-free-icons";
import { Button as ArcButton } from "@/components/arc/button/button";
import { NoteBody } from "@/components/notes/note-editor";
import { NoteDiff } from "@/components/notes/note-diff";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "@/components/ui/toast";
import { memoryQueryKey } from "@/context/MemoryContext";
import { reprocessMemory, rewriteNote, type NoteRewriteMode } from "@/lib/memories";

const MODES: { mode: NoteRewriteMode; label: string; icon: typeof Fix; done: string }[] = [
  { mode: "fix", label: "Fix spelling and grammar", icon: Fix, done: "Spelling and grammar fixed" },
  { mode: "improve", label: "Improve the writing", icon: Improve, done: "The writing, improved" },
  { mode: "shorten", label: "Make it shorter", icon: Shorter, done: "A shorter version" },
];

/** The selection toolbar's AI actions, shorter for the small toolbar. */
export const SELECTION_ACTIONS: { id: NoteRewriteMode; label: string }[] = [
  { id: "fix", label: "Fix" },
  { id: "improve", label: "Improve" },
  { id: "shorten", label: "Shorter" },
];

export interface NoteAiMenuHandle {
  /** Rewrites a part of the note (what's selected); `apply` puts the chosen result back, false when that text changed meanwhile. */
  rewritePart: (mode: NoteRewriteMode, markdown: string, apply: (markdown: string) => boolean, context?: { before: string; after: string }) => void;
}

/**
 * The note editor's AI menu: rewrite the whole note, or (from the selection
 * toolbar) a part of it, always shown first with what changed and replaced
 * only when chosen (Ctrl/⌘+Z undoes it); or run Savedly's processing again
 * for fresh tags, summary and dates.
 */
export const NoteAiMenu = forwardRef<
  NoteAiMenuHandle,
  {
    /** Null until the note's first save: there's nothing to work on yet. */
    noteId: string | null;
    getMarkdown: () => string;
    onReplace: (markdown: string) => void;
    /** Saves what's on the page, so the refresh reads the latest. */
    beforeRefresh: () => Promise<void>;
  }
>(function NoteAiMenu({ noteId, getMarkdown, onReplace, beforeRefresh }, ref) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<NoteRewriteMode | "refresh" | null>(null);
  const [result, setResult] = useState<{ mode: NoteRewriteMode; before: string; markdown: string; part: boolean; apply: (markdown: string) => boolean } | null>(null);
  // The preview opens on what changed; "Result" shows the new version as it will look.
  const [view, setView] = useState<"changes" | "result">("changes");

  const run = async (mode: NoteRewriteMode, markdown: string, part: boolean, apply: (markdown: string) => boolean, context?: { before: string; after: string }) => {
    if (!noteId || !markdown.trim()) {
      toast.add({ title: part ? "Select some text first" : "Write something first", type: "warning" });
      return;
    }
    if (busy) return;
    setBusy(mode);
    try {
      const answer = await rewriteNote(noteId, mode, markdown.trim(), part, context);
      if (answer.markdown.trim() === markdown.trim()) toast.add({ title: "Nothing to change", description: part ? "The AI left it as it is." : "The AI left the note as it is.", type: "success" });
      else {
        setView("changes");
        setResult({ mode, before: markdown.trim(), markdown: answer.markdown, part, apply });
      }
    } catch (err) {
      toast.add({ title: "Couldn't rewrite the note", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const rewrite = (mode: NoteRewriteMode) =>
    run(mode, getMarkdown(), false, (markdown) => {
      onReplace(markdown);
      return true;
    });
  useImperativeHandle(ref, () => ({ rewritePart: (mode, markdown, apply, context) => void run(mode, markdown, true, apply, context) }));

  const refresh = async () => {
    if (!noteId) return;
    setBusy("refresh");
    try {
      await beforeRefresh();
      await reprocessMemory(noteId);
      void queryClient.invalidateQueries({ queryKey: memoryQueryKey(noteId) });
      void queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.add({ title: "Updating the tags and summary", description: "They're on the note's details page in a moment.", type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't refresh it", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const shown = result ? MODES.find((m) => m.mode === result.mode)! : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!noteId || busy !== null}
          title={noteId ? "Write with AI" : "Write something first"}
          render={
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <HugeiconsIcon icon={busy ? Spinner : Sparkles} strokeWidth={2} className={busy ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"} />
              {busy === "refresh" ? "Refreshing…" : busy ? "Writing…" : "AI"}
            </button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-60">
          {/* Base UI's label belongs to a group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Write with AI</DropdownMenuLabel>
            {MODES.map(({ mode, label, icon }) => (
              <DropdownMenuItem key={mode} onClick={() => void rewrite(mode)}>
                <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void refresh()}>
            <HugeiconsIcon icon={Refresh} strokeWidth={2} className="size-4" /> Refresh tags and summary
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveDialog
        open={!!result}
        onOpenChange={(open) => !open && setResult(null)}
        title={shown?.done ?? "Suggested version"}
        description={
          result?.part
            ? "See what changed before it replaces what you selected. Ctrl/⌘+Z in the note brings yours back."
            : "See what changed before it replaces your note. Ctrl/⌘+Z in the note brings yours back."
        }
        className="sm:max-w-2xl"
      >
        {result && (
          <div className="space-y-4">
            <SegmentedControl
              label="Preview"
              value={view}
              onValueChange={(value) => setView(value as "changes" | "result")}
              options={[
                { value: "changes", label: "Changes" },
                { value: "result", label: "Result" },
              ]}
            />
            <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-border/70 bg-muted/25 px-5 py-4">
              {view === "changes" ? <NoteDiff before={result.before} after={result.markdown} /> : <NoteBody markdown={result.markdown} />}
            </div>
            <div className="flex justify-end gap-2">
              <ArcButton variant="secondary" onClick={() => setResult(null)}>
                Keep mine
              </ArcButton>
              <ArcButton
                onClick={() => {
                  const done = result.apply(result.markdown);
                  setResult(null);
                  if (done) toast.add({ title: result.part ? "Replaced" : "Note replaced", description: "Ctrl/⌘+Z in the note brings yours back.", type: "success" });
                  else toast.add({ title: "That text changed meanwhile", description: "Select it again and try once more.", type: "warning" });
                }}
              >
                Replace
              </ArcButton>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
});
