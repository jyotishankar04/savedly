"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { firstSavePrompts } from "./onboarding-data";

/** STEP 7: Save a first memory (optional) */
export function StepFirstSave({
  customLink,
  setCustomLink,
  firstSavePrompt,
  setFirstSavePrompt,
  submitError,
  isPending,
  onSubmit,
  onSkip,
}: {
  customLink: string;
  setCustomLink: (text: string) => void;
  firstSavePrompt: number | null;
  setFirstSavePrompt: (index: number) => void;
  submitError: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}) {
  const firstSaveBox = useRef<HTMLTextAreaElement>(null);

  return (
          <div className="w-full max-w-lg space-y-8 animate-fade-in my-auto">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                Save your first thing
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Anything you&apos;d be sorry to lose. Savedly gives it a title, a short summary and tags, and it&apos;s on your home page when you get there.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground text-center">Not sure? Pick one</p>
              <div className="flex flex-wrap justify-center gap-2">
                {firstSavePrompts.map((prompt, i) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => {
                      setFirstSavePrompt(i);
                      firstSaveBox.current?.focus();
                    }}
                    className={cn(
                      "h-9 rounded-full border px-4 text-[13px] font-medium transition-colors",
                      firstSavePrompt === i
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <textarea
                ref={firstSaveBox}
                aria-label="What to save"
                placeholder={firstSavePrompt === null ? "Paste a link or write something" : firstSavePrompts[firstSavePrompt].hint}
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                }}
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3.5 text-base leading-relaxed text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <p className="text-xs text-muted-foreground text-center">
                Nothing to hand?{" "}
                <button
                  type="button"
                  onClick={() => setCustomLink(`${window.location.origin}/help/docs/get-started/getting-started`)}
                  className="font-medium text-primary hover:underline"
                >
                  Save our getting-started guide
                </button>
              </p>
              {submitError && (
                <p className="text-xs text-destructive text-center">{submitError}</p>
              )}
              <Button
                type="submit"
                disabled={!customLink.trim() || isPending}
                className="w-full h-11 rounded-full font-medium shadow-xs"
              >
                {isPending ? "Saving…" : "Save it"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={isPending}
                className="w-full h-10 rounded-full font-medium text-muted-foreground"
              >
                Skip for now
              </Button>
            </form>
          </div>
  );
}
