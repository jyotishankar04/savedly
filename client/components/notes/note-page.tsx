"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  NOTE_DRAFT_KEY,
  type NoteDraft,
} from "@/components/notes/capture-note";
import { QueryErrorState } from "@/components/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoryQuery } from "@/context/MemoryContext";
import { NoteWriter } from "@/components/notes/writer/note-writer";

/** A title the server filled in because none was given: the box shows it empty, with "Untitled" as its placeholder. */
const PLACEHOLDER_TITLE = /^(untitled|untitled note)$/i;

/**
 * The full-page note editor (app/notes/new and app/notes/[id]): a big title,
 * then the note, saved as you write. A new note is created by its first save.
 */
export function NotePage({ id }: { id?: string }) {
  const {
    data: memory,
    isLoading,
    isError,
    refetch,
  } = useMemoryQuery(id ?? "", {
    // The page owns the text while it's open; polling would only fight it.
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  // A new note may come with a draft from the capture dialog's "Open full page".
  const [draft, setDraft] = useState<NoteDraft | null | undefined>(
    id ? null : undefined,
  );
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
        <p className="text-sm text-muted-foreground">
          This memory isn&apos;t a note, so it can&apos;t be edited here.
        </p>
        <Link
          href={`/app/memories/${memory.id}`}
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Open it
        </Link>
      </div>
    );
  }

  return (
    <NoteWriter
      key={id ?? "new"}
      noteId={memory?.id ?? null}
      initialTitle={
        memory
          ? PLACEHOLDER_TITLE.test(memory.title.trim())
            ? ""
            : memory.title
          : (draft?.title ?? "")
      }
      initialMarkdown={
        memory ? (memory.content ?? "") : (draft?.markdown ?? "")
      }
      collectionIds={draft?.collectionIds ?? []}
    />
  );
}
