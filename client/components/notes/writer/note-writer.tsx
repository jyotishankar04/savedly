"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { NoteEditor } from "@/components/notes/note-editor";
import { SELECTION_ACTIONS, type NoteAiMenuHandle } from "@/components/notes/note-ai-menu";
import { toast } from "@/components/ui/toast";
import { NoteHeader } from "./note-header";
import { TitleField } from "./title-field";
import { useNoteAutosave } from "./use-note-autosave";

/** The page itself: header, title and the editor, saved as you write. */
export function NoteWriter({
  noteId,
  initialTitle,
  initialMarkdown,
  collectionIds,
}: {
  noteId: string | null;
  initialTitle: string;
  initialMarkdown: string;
  collectionIds: string[];
}) {
  const reduced = useReducedMotion();
  const editor = useRef<RichTextEditorHandle>(null);
  const aiMenu = useRef<NoteAiMenuHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const note = useNoteAutosave({ noteId, initialTitle, initialMarkdown, collectionIds, editor });
  const { id, latest } = note;

  return (
    // Rises into place: from Notes, New note, or the dialog's "Open full page".
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:px-6 md:pt-6"
    >
      <NoteHeader
        id={id}
        state={note.state}
        status={note.status}
        aiMenu={aiMenu}
        getMarkdown={() => editor.current?.getMarkdown() ?? latest.current.markdown}
        onReplace={(markdown) => editor.current?.setMarkdown(markdown)}
        beforeRefresh={note.save}
        onRetry={() => void note.save()}
        onTrash={note.moveToTrash}
      />

      {note.error && note.state === "error" && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {note.error}
        </p>
      )}

      <TitleField
        titleRef={titleRef}
        title={note.title}
        noteExists={!!id}
        autoFocus={!noteId && !initialTitle && !initialMarkdown}
        onChange={note.changeTitle}
        onEnter={() => editor.current?.focus()}
        getSuggestionInput={() => ({
          id: note.idRef.current,
          title: latest.current.title,
          markdown: editor.current?.getMarkdown() ?? latest.current.markdown,
        })}
      />

      <NoteEditor
        ref={editor}
        size="page"
        markdown={initialMarkdown}
        // Select text, then ✨ in its toolbar: the AI rewrites just that (once the note has been saved).
        selectionActions={id ? SELECTION_ACTIONS : undefined}
        onSelectionAction={(action, selection) =>
          aiMenu.current?.rewritePart(
            action as (typeof SELECTION_ACTIONS)[number]["id"],
            selection.markdown,
            (markdown) =>
              editor.current?.replaceSelection(selection, markdown) ?? false,
            selection.context,
          )
        }
        autoFocus={!noteId && !!(initialTitle || initialMarkdown)}
        onChange={(value) => note.changeMarkdown(value.markdown)}
        onUploadState={(upload) => {
          if (upload.error)
            toast.add({
              title: "Couldn't add the picture",
              description: upload.error,
              type: "error",
            });
        }}
      />
    </motion.div>
  );
}
