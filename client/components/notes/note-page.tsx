"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, Delete02Icon as Trash, InformationCircleIcon as Info } from "@hugeicons/core-free-icons";
import type { RichTextEditorHandle } from "@/components/arc/rich-text-editor/rich-text-editor";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteAiMenu, SELECTION_ACTIONS, type NoteAiMenuHandle } from "@/components/notes/note-ai-menu";
import { NOTE_DRAFT_KEY, type NoteDraft } from "@/components/notes/capture-note";
import { QueryErrorState } from "@/components/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { memoryQueryKey, useMemoryQuery, useMoveToTrashMutation } from "@/context/MemoryContext";
import { deriveTitle } from "@/lib/detect-memory-type";
import { createMemory, updateMemory } from "@/lib/memories";

/** A title the server filled in because none was given: the box shows it empty, with "Untitled" as its placeholder. */
const PLACEHOLDER_TITLE = /^(untitled|untitled note)$/i;

/**
 * The full-page note editor (app/notes/new and app/notes/[id]): a big title,
 * then the note, saved as you write. A new note is created by its first save.
 */
export function NotePage({ id }: { id?: string }) {
  const { data: memory, isLoading, isError, refetch } = useMemoryQuery(id ?? "", {
    // The page owns the text while it's open; polling would only fight it.
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  // A new note may come with a draft from the capture dialog's "Open full page".
  const [draft, setDraft] = useState<NoteDraft | null | undefined>(id ? null : undefined);
  // Read once: the draft is removed as it's read, and a second run (React's development double-run) would find it gone.
  const draftRead = useRef(false);
  useEffect(() => {
    if (id || draftRead.current) return;
    draftRead.current = true;
    let found: NoteDraft | null = null;
    try {
      const raw = sessionStorage.getItem(NOTE_DRAFT_KEY);
      sessionStorage.removeItem(NOTE_DRAFT_KEY);
      if (raw) found = JSON.parse(raw) as NoteDraft;
    } catch {
      // No storage, or a damaged draft: start empty.
    }
    setDraft(found);
  }, [id]);

  if (id && isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <QueryErrorState onRetry={() => refetch()} />
      </div>
    );
  }
  if ((id && (isLoading || !memory)) || draft === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }
  if (memory && memory.type !== "note") {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">This memory isn&apos;t a note, so it can&apos;t be edited here.</p>
        <Link href={`/app/memories/${memory.id}`} className="text-sm font-medium text-primary underline underline-offset-4">
          Open it
        </Link>
      </div>
    );
  }

  return (
    <NoteWriter
      key={id ?? "new"}
      noteId={memory?.id ?? null}
      initialTitle={memory ? (PLACEHOLDER_TITLE.test(memory.title.trim()) ? "" : memory.title) : (draft?.title ?? "")}
      initialMarkdown={memory ? (memory.content ?? "") : (draft?.markdown ?? "")}
      collectionIds={draft?.collectionIds ?? []}
    />
  );
}

type SaveState = "saved" | "editing" | "saving" | "error";

function NoteWriter({ noteId, initialTitle, initialMarkdown, collectionIds }: { noteId: string | null; initialTitle: string; initialMarkdown: string; collectionIds: string[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trash = useMoveToTrashMutation();
  const editor = useRef<RichTextEditorHandle>(null);
  const aiMenu = useRef<NoteAiMenuHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [id, setId] = useState(noteId);
  const idRef = useRef(noteId);
  const [title, setTitle] = useState(initialTitle);
  const hasDraft = !noteId && !!(initialMarkdown.trim() || initialTitle.trim());
  const [state, setState] = useState<SaveState>(hasDraft ? "editing" : "saved");
  const [error, setError] = useState<string | null>(null);

  // What's on the page, and what the server last accepted.
  const latest = useRef({ title: initialTitle, markdown: initialMarkdown });
  const saved = useRef(noteId ? { title: initialTitle, markdown: initialMarkdown } : { title: "", markdown: "" });
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The editor reports its text once on opening, as it writes it: that's the starting point, not an edit.
  const baselined = useRef(false);
  const collections = useRef(collectionIds);
  // The save to run next, for a save that finds more to send once it's done.
  const again = useRef<() => void>(() => {});
  const dirty = () => latest.current.title !== saved.current.title || latest.current.markdown !== saved.current.markdown;

  // One save at a time; whatever changed meanwhile goes in the next one.
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || !dirty()) return;
    const { title: typedTitle, markdown } = latest.current;
    // Nothing written yet: there's no note to create.
    if (!idRef.current && !markdown.trim() && !typedTitle.trim()) return;
    saving.current = true;
    setState("saving");
    const finalTitle = typedTitle.trim() || deriveTitle("note", editor.current?.getText() ?? "");
    try {
      if (!idRef.current) {
        const created = await createMemory({ type: "note", title: finalTitle, content: markdown, collectionIds: collections.current.length ? collections.current : undefined, editing: true, onDuplicate: "allow" });
        idRef.current = created.id;
        setId(created.id);
        // The address becomes the note's own, without a navigation: the editor keeps its place.
        window.history.replaceState(null, "", `/app/notes/${created.id}`);
        queryClient.setQueryData(memoryQueryKey(created.id), created);
      } else {
        const updated = await updateMemory(idRef.current, { title: finalTitle, content: markdown });
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
  }, [queryClient]);
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
      onError: (err) => toast.add({ title: "Couldn't move it to Trash", description: err instanceof Error ? err.message : undefined, type: "error" }),
    });
  };

  const status = state === "saving" ? "Saving…" : state === "editing" ? "Editing" : state === "error" ? "Not saved" : id ? "Saved" : "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:px-6 md:pt-6">
      <div className="mb-8 flex items-center justify-between gap-3 md:mb-12">
        <Link href="/app/notes" className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2} className="size-4" />
          Notes
        </Link>
        <div className="flex items-center gap-1">
          <span aria-live="polite" className={state === "error" ? "mr-1 text-xs font-medium text-destructive" : "mr-1 text-xs text-muted-foreground"}>
            {status}
          </span>
          {state === "error" && (
            <button type="button" onClick={() => void save()} className="mr-1 rounded-full px-2 py-1 text-xs font-medium text-foreground underline underline-offset-4">
              Try again
            </button>
          )}
          <NoteAiMenu
            ref={aiMenu}
            noteId={id}
            getMarkdown={() => editor.current?.getMarkdown() ?? latest.current.markdown}
            onReplace={(markdown) => editor.current?.setMarkdown(markdown)}
            beforeRefresh={save}
          />
          {id && (
            <Link href={`/app/memories/${id}`} title="Details: summary, tags and collections" aria-label="Details" className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <HugeiconsIcon icon={Info} strokeWidth={2} className="size-[18px]" />
            </Link>
          )}
          <button type="button" onClick={moveToTrash} title="Move to Trash" aria-label="Move to Trash" className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
            <HugeiconsIcon icon={Trash} strokeWidth={2} className="size-[18px]" />
          </button>
        </div>
      </div>

      {error && state === "error" && (
        <p role="alert" className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <label htmlFor="note-title" className="sr-only">
        Title
      </label>
      <textarea
        id="note-title"
        ref={titleRef}
        rows={1}
        maxLength={500}
        value={title}
        placeholder="Untitled"
        autoFocus={!noteId && !initialTitle && !initialMarkdown}
        onChange={(e) => {
          const next = e.target.value.replace(/\n/g, " ");
          setTitle(next);
          latest.current = { ...latest.current, title: next };
          schedule();
        }}
        onKeyDown={(e) => {
          // Enter goes on to the note itself.
          if (e.key === "Enter" || (e.key === "ArrowDown" && e.currentTarget.selectionStart === e.currentTarget.value.length)) {
            e.preventDefault();
            editor.current?.focus();
          }
        }}
        className="mb-6 block w-full resize-none bg-transparent text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none [field-sizing:content] [overflow-wrap:anywhere] placeholder:text-muted-foreground/50 sm:text-4xl"
      />

      <NoteEditor
        ref={editor}
        size="page"
        markdown={initialMarkdown}
        // Select text, then ✨ in its toolbar: the AI rewrites just that (once the note has been saved).
        selectionActions={id ? SELECTION_ACTIONS : undefined}
        onSelectionAction={(action, selection) =>
          aiMenu.current?.rewritePart(action as (typeof SELECTION_ACTIONS)[number]["id"], selection.markdown, (markdown) => editor.current?.replaceSelection(selection, markdown) ?? false)
        }
        autoFocus={!noteId && !!(initialTitle || initialMarkdown)}
        onChange={(value) => {
          if (!baselined.current) {
            baselined.current = true;
            latest.current = { ...latest.current, markdown: value.markdown };
            if (noteId) saved.current = { ...saved.current, markdown: value.markdown };
            return;
          }
          if (value.markdown === latest.current.markdown) return;
          latest.current = { ...latest.current, markdown: value.markdown };
          schedule();
        }}
        onUploadState={(upload) => {
          if (upload.error) toast.add({ title: "Couldn't add the picture", description: upload.error, type: "error" });
        }}
      />
    </div>
  );
}
