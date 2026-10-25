"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon as Copy, Tick02Icon as Tick, PencilEdit02Icon as Pencil } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import { NoteBody } from "@/components/notes/note-editor";
import type { MemoryDetail } from "@/types/memory";

/** A note memory's own text: shown formatted (or as code), with Copy and Edit. */
export function NoteSection({ memory, code }: { memory: MemoryDetail; code: boolean }) {
  const router = useRouter();
  const updateMutation = useUpdateMemoryMutation();
  // `content` is the body of a "note" memory, and for every other type the
  // caption the user typed alongside a link or file. Both are edited here,
  // off a local draft seeded from memory.content when editing starts.
  const [draftNote, setDraftNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const startEditing = () => {
    setDraftNote(memory.content ?? "");
    setIsEditing(true);
  };
  const saveEditing = () => {
    updateMutation.mutate({ id: memory.id, patch: { content: draftNote.trim() } });
    setIsEditing(false);
  };
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(memory.content ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the text stays selectable.
    }
  };

  return (
            <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{code ? "Command" : "Note"}</span>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="h-7 rounded-full px-3 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditing}
                        className="h-7 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={copyContent}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={copied ? Tick : Copy} strokeWidth={2.25} className={cn("h-3.5 w-3.5", copied && "text-primary")} />
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        // A note is edited full page, in the note editor; code stays a plain text box here.
                        onClick={code ? startEditing : () => router.push(`/app/notes/${memory.id}`)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Pencil} strokeWidth={2.25} className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  className={cn(
                    "block w-full min-h-48 resize-y bg-transparent px-5 py-4 text-foreground focus:outline-none",
                    code ? "font-mono text-[13px] leading-6" : "text-sm leading-7",
                  )}
                  autoFocus
                />
              ) : code ? (
                <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-6 text-foreground">
                  <code>{memory.content}</code>
                </pre>
              ) : (
                <div className="px-5 py-4 text-sm leading-7 text-foreground">
                  {memory.content ? <NoteBody markdown={memory.content} /> : <span className="text-muted-foreground">This note is empty.</span>}
                </div>
              )}
            </section>
  );
}
