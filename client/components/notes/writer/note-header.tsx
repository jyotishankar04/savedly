"use client";

import type { Ref } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, Delete02Icon as Trash, InformationCircleIcon as Info } from "@hugeicons/core-free-icons";
import { NoteAiMenu, type NoteAiMenuHandle } from "@/components/notes/note-ai-menu";
import type { SaveState } from "./use-note-autosave";

/** The bar above the note: back to Notes, the save status, the AI menu, Details and Trash. */
export function NoteHeader({
  id,
  state,
  status,
  aiMenu,
  getMarkdown,
  onReplace,
  beforeRefresh,
  onRetry,
  onTrash,
}: {
  id: string | null;
  state: SaveState;
  status: string;
  aiMenu: Ref<NoteAiMenuHandle>;
  getMarkdown: () => string;
  onReplace: (markdown: string) => void;
  beforeRefresh: () => Promise<void>;
  onRetry: () => void;
  onTrash: () => void;
}) {
  return (
      <div className="mb-8 flex items-center justify-between gap-3 md:mb-12">
        <Link
          href="/app/notes"
          className="-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2} className="size-4" />
          Notes
        </Link>
        <div className="flex items-center gap-1">
          <span
            aria-live="polite"
            className={
              state === "error"
                ? "mr-1 text-xs font-medium text-destructive"
                : "mr-1 text-xs text-muted-foreground"
            }
          >
            {status}
          </span>
          {state === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="mr-1 rounded-full px-2 py-1 text-xs font-medium text-foreground underline underline-offset-4"
            >
              Try again
            </button>
          )}
          <NoteAiMenu
            ref={aiMenu}
            noteId={id}
            getMarkdown={getMarkdown}
            onReplace={onReplace}
            beforeRefresh={beforeRefresh}
          />
          {id && (
            <Link
              href={`/app/memories/${id}`}
              title="Details: summary, tags and collections"
              aria-label="Details"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Info}
                strokeWidth={2}
                className="size-[18px]"
              />
            </Link>
          )}
          <button
            type="button"
            onClick={onTrash}
            title="Move to Trash"
            aria-label="Move to Trash"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <HugeiconsIcon
              icon={Trash}
              strokeWidth={2}
              className="size-[18px]"
            />
          </button>
        </div>
      </div>
  );
}
