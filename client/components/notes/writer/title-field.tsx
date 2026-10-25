"use client";

import { useState, type Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon as Close, Loading03Icon as Spinner, SparklesIcon as Sparkles } from "@hugeicons/core-free-icons";
import { toast } from "@/components/ui/toast";
import { suggestNoteTitles } from "@/lib/memories";

/** The note's big title, with ✨ beside it (once the note exists) to pick from three AI titles. */
export function TitleField({
  titleRef,
  title,
  noteExists,
  autoFocus,
  onChange,
  onEnter,
  getSuggestionInput,
}: {
  titleRef: Ref<HTMLTextAreaElement>;
  title: string;
  noteExists: boolean;
  autoFocus: boolean;
  onChange: (title: string) => void;
  onEnter: () => void;
  /** What the suggestions are asked about: the note's id and what's written now. */
  getSuggestionInput: () => { id: string | null; title: string; markdown: string };
}) {
  // ✨ by the title: three AI titles to pick from.
  const [titleIdeas, setTitleIdeas] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const suggestTitles = async () => {
    const input = getSuggestionInput();
    if (!input.id || suggesting) return;
    setSuggesting(true);
    try {
      const { titles } = await suggestNoteTitles(input.id, input.title, input.markdown);
      setTitleIdeas(titles);
    } catch (err) {
      toast.add({
        title: "Couldn't suggest a title",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <>
      <label htmlFor="note-title" className="sr-only">
        Title
      </label>
      <div className="mb-6">
        <div className="group/title flex items-start gap-2">
          <textarea
            id="note-title"
            ref={titleRef}
            rows={1}
            maxLength={500}
            value={title}
            placeholder="Untitled"
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              // Enter goes on to the note itself.
              if (
                e.key === "Enter" ||
                (e.key === "ArrowDown" &&
                  e.currentTarget.selectionStart ===
                    e.currentTarget.value.length)
              ) {
                e.preventDefault();
                onEnter();
              }
            }}
            className="block min-w-0 flex-1 resize-none bg-transparent text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none [field-sizing:content] [overflow-wrap:anywhere] placeholder:text-muted-foreground/50 sm:text-4xl"
          />
          {noteExists && (
            <button
              type="button"
              onClick={() => void suggestTitles()}
              disabled={suggesting}
              title="Suggest a title with AI"
              aria-label="Suggest a title with AI"
              className="mt-1.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary opacity-70 transition-[opacity,background-color] hover:bg-primary/15 hover:opacity-100 focus-visible:opacity-100 group-focus-within/title:opacity-100 disabled:opacity-100 sm:mt-2"
            >
              <HugeiconsIcon
                icon={suggesting ? Spinner : Sparkles}
                strokeWidth={2}
                className={
                  suggesting
                    ? "size-3.5 animate-spin motion-reduce:animate-none"
                    : "size-3.5"
                }
              />
              {suggesting ? "Thinking…" : "Title"}
            </button>
          )}
        </div>
        {titleIdeas && (
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Suggested titles"
          >
            <span className="text-xs text-muted-foreground">Suggested:</span>
            {titleIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => {
                  onChange(idea);
                  setTitleIdeas(null);
                }}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                {idea}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTitleIdeas(null)}
              aria-label="Keep my title"
              title="Keep my title"
              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Close}
                strokeWidth={2}
                className="size-3.5"
              />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
