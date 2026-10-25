"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon as ArrowUp } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlanLimitNotice, ProBadge } from "@/components/plan-limit-notice";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { cn } from "@/lib/utils";

/** The question box under the conversation. */
export function Composer({
  input,
  setInput,
  onSubmit,
  isBusy,
  queryLimit,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isBusy: boolean;
  queryLimit: ReturnType<typeof usePlanLimit>;
}) {
  return (
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto w-full px-6 pt-3 shrink-0 space-y-2">
          {queryLimit.isAtLimit && (
            <PlanLimitNotice message={queryLimit.message ?? "You've reached your Ask query limit for this month."} />
          )}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10",
              queryLimit.isAtLimit && "opacity-60",
            )}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "TEXTAREA" || target.closest("button")) return;
              e.currentTarget.querySelector("textarea")?.focus();
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder={queryLimit.isAtLimit ? "You've reached your Ask query limit for this month..." : "Ask anything about what you've saved..."}
              rows={1}
              className="min-h-[48px] max-h-48 resize-none border-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-none focus-visible:ring-0 dark:bg-transparent"
              disabled={isBusy || queryLimit.isAtLimit}
            />
            <div className="flex items-center justify-between gap-2 pl-4 pr-2.5 pb-2.5">
              <span className="hidden text-xs text-muted-foreground/80 sm:inline">
                <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line
              </span>
              <span className="flex items-center gap-2 ml-auto">
                {queryLimit.isAtLimit && <ProBadge />}
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  title={queryLimit.isAtLimit ? queryLimit.message ?? undefined : undefined}
                  className="h-9 w-9 shrink-0 rounded-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                  disabled={isBusy || queryLimit.isAtLimit || !input.trim()}
                >
                  <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-4 w-4" />
                </Button>
              </span>
            </div>
          </div>
        </form>
  );
}
