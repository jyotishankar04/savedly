"use client";

import { useState } from "react";
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

/**
 * The note editor's AI menu: rewrite the whole note (shown first, replaced
 * only when chosen, and undone with Ctrl/⌘+Z), or run Savedly's processing
 * again for fresh tags, summary and dates.
 */
export function NoteAiMenu({
  noteId,
  getMarkdown,
  onReplace,
  beforeRefresh,
}: {
  /** Null until the note's first save: there's nothing to work on yet. */
  noteId: string | null;
  getMarkdown: () => string;
  onReplace: (markdown: string) => void;
  /** Saves what's on the page, so the refresh reads the latest. */
  beforeRefresh: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<NoteRewriteMode | "refresh" | null>(null);
  const [result, setResult] = useState<{ mode: NoteRewriteMode; markdown: string } | null>(null);

  const rewrite = async (mode: NoteRewriteMode) => {
    const markdown = getMarkdown().trim();
    if (!noteId || !markdown) {
      toast.add({ title: "Write something first", type: "warning" });
      return;
    }
    setBusy(mode);
    try {
      const answer = await rewriteNote(noteId, mode, markdown);
      if (answer.markdown.trim() === markdown) toast.add({ title: "Nothing to change", description: "The AI left the note as it is.", type: "success" });
      else setResult({ mode, markdown: answer.markdown });
    } catch (err) {
      toast.add({ title: "Couldn't rewrite the note", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setBusy(null);
    }
  };

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
        description="Have a look before it replaces your note. Ctrl/⌘+Z in the note brings yours back."
        className="sm:max-w-2xl"
      >
        {result && (
          <div className="space-y-5">
            <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-border/70 bg-muted/25 px-5 py-4">
              <NoteBody markdown={result.markdown} />
            </div>
            <div className="flex justify-end gap-2">
              <ArcButton variant="secondary" onClick={() => setResult(null)}>
                Keep mine
              </ArcButton>
              <ArcButton
                onClick={() => {
                  onReplace(result.markdown);
                  setResult(null);
                  toast.add({ title: "Note replaced", description: "Ctrl/⌘+Z in the note brings yours back.", type: "success" });
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
}
