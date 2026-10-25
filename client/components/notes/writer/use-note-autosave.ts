"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { toast } from "@/components/ui/toast";
import { memoryQueryKey, useMoveToTrashMutation } from "@/context/MemoryContext";
import { deriveTitle } from "@/lib/detect-memory-type";
import { createMemory, updateMemory } from "@/lib/memories";

export type SaveState = "saved" | "editing" | "saving" | "error";

type Options = {
  noteId: string | null;
  initialTitle: string;
  initialMarkdown: string;
  collectionIds: string[];
  editor: RefObject<RichTextEditorHandle | null>;
};

/**
 * Saves a note as it's written: one save at a time, the next one scheduled
 * after typing stops. A new note is created by its first save; after that the
 * address becomes the note's own without a navigation.
 */
export function useNoteAutosave({ noteId, initialTitle, initialMarkdown, collectionIds, editor }: Options) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trash = useMoveToTrashMutation();
  const [id, setId] = useState(noteId);
  const idRef = useRef(noteId);
  const [title, setTitle] = useState(initialTitle);
  const hasDraft = !noteId && !!(initialMarkdown.trim() || initialTitle.trim());
  const [state, setState] = useState<SaveState>(hasDraft ? "editing" : "saved");
  const [error, setError] = useState<string | null>(null);

  // What's on the page, and what the server last accepted.
  const latest = useRef({ title: initialTitle, markdown: initialMarkdown });
  const saved = useRef(
    noteId
      ? { title: initialTitle, markdown: initialMarkdown }
      : { title: "", markdown: "" },
  );
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The editor reports its text once on opening, as it writes it: that's the starting point, not an edit.
  const baselined = useRef(false);
  const collections = useRef(collectionIds);
  // The save to run next, for a save that finds more to send once it's done.
  const again = useRef<() => void>(() => {});
  const dirty = () =>
    latest.current.title !== saved.current.title ||
    latest.current.markdown !== saved.current.markdown;

  // One save at a time; whatever changed meanwhile goes in the next one.
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || !dirty()) return;
    const { title: typedTitle, markdown } = latest.current;
    // Nothing written yet: there's no note to create.
    if (!idRef.current && !markdown.trim() && !typedTitle.trim()) return;
    saving.current = true;
    setState("saving");
    const finalTitle =
      typedTitle.trim() || deriveTitle("note", editor.current?.getText() ?? "");
    try {
      if (!idRef.current) {
        const created = await createMemory({
          type: "note",
          title: finalTitle,
          content: markdown,
          collectionIds: collections.current.length
            ? collections.current
            : undefined,
          editing: true,
          onDuplicate: "allow",
        });
        idRef.current = created.id;
        setId(created.id);
        // The address becomes the note's own, without a navigation: the editor keeps its place.
        window.history.replaceState(null, "", `/app/notes/${created.id}`);
        queryClient.setQueryData(memoryQueryKey(created.id), created);
      } else {
        const updated = await updateMemory(idRef.current, {
          title: finalTitle,
          content: markdown,
        });
        queryClient.setQueryData(memoryQueryKey(idRef.current), updated);
      }
      saved.current = { title: typedTitle, markdown };
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["memories"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the note.");
      setState("error");
      saving.current = false;
      return;
    }
    saving.current = false;
    if (dirty()) again.current();
    else setState("saved");
  }, [queryClient, editor]);
  useEffect(() => {
    again.current = () => void save();
  }, [save]);

  const schedule = useCallback(() => {
    setState("editing");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 700);
  }, [save]);

  // A draft from the capture dialog isn't saved yet.
  useEffect(() => {
    if (!hasDraft) return;
    timer.current = setTimeout(() => void save(), 700);
    return () => clearTimeout(timer.current);
  }, [hasDraft, save]);

  // Leaving with something unsaved: the browser asks first, and a move within the app saves on the way out.
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty() && !saving.current) return;
      void save();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      void save();
    };
  }, [save]);

  const changeTitle = (next: string) => {
    setTitle(next);
    latest.current = { ...latest.current, title: next };
    schedule();
  };

  const changeMarkdown = (markdown: string) => {
    if (!baselined.current) {
      baselined.current = true;
      latest.current = { ...latest.current, markdown };
      if (noteId) saved.current = { ...saved.current, markdown };
      return;
    }
    if (markdown === latest.current.markdown) return;
    latest.current = { ...latest.current, markdown };
    schedule();
  };

  const moveToTrash = () => {
    const current = idRef.current;
    if (!current) {
      router.push("/app/notes");
      return;
    }
    clearTimeout(timer.current);
    saved.current = latest.current;
    trash.mutate(current, {
      onSuccess: () => {
        toast.add({ title: "Moved to Trash", type: "success" });
        router.push("/app/notes");
      },
      onError: (err) =>
        toast.add({
          title: "Couldn't move it to Trash",
          description: err instanceof Error ? err.message : undefined,
          type: "error",
        }),
    });
  };

  const status =
    state === "saving"
      ? "Saving…"
      : state === "editing"
        ? "Editing"
        : state === "error"
          ? "Not saved"
          : id
            ? "Saved"
            : "";

  return { id, idRef, title, state, error, status, latest, save, changeTitle, changeMarkdown, moveToTrash };
}
