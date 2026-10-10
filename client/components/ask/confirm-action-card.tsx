"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon as Question } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * What a tool answers when it needs the user's yes before acting (server
 * rag/tools/confirm.ts). Nothing has changed at that point.
 */
interface ConfirmationRequest {
  needsConfirmation: true;
  pendingActionId: string;
  description: string;
}

/** What the server reads as a yes, and what it reads as anything else. */
export const CONFIRM_TEXT = "Yes, do it";
export const CANCEL_TEXT = "Cancel";

type Part = { type: string; state?: string; output?: unknown };

/** The actions a reply is waiting on a yes for, each once. */
export function pendingConfirmations(parts: readonly Part[]): ConfirmationRequest[] {
  const found = new Map<string, ConfirmationRequest>();
  for (const part of parts) {
    if (part.type !== "dynamic-tool" || part.state !== "output-available") continue;
    try {
      const content = (part.output as { kwargs?: { content?: string } })?.kwargs?.content;
      if (!content) continue;
      const parsed = JSON.parse(content) as ConfirmationRequest;
      if (parsed?.needsConfirmation === true && typeof parsed.description === "string" && parsed.pendingActionId) {
        found.set(parsed.pendingActionId, parsed);
      }
    } catch {
      // Not JSON: some other tool's output.
    }
  }
  return [...found.values()];
}

/**
 * Under Ask's question "shall I do this?": what it would do, and the two
 * answers. The buttons send an ordinary message, so typing "yes" works the
 * same way.
 */
export function ConfirmActionCard({
  actions,
  onAnswer,
  disabled = false,
  compact = false,
}: {
  actions: ConfirmationRequest[];
  onAnswer: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  if (actions.length === 0) return null;
  return (
    <div role="group" aria-label="Confirm this action" className={cn("w-full max-w-md rounded-2xl border border-border bg-card p-3.5", compact && "p-3")}>
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={Question} strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nothing has changed yet</p>
          {actions.length === 1 ? (
            <p className="text-sm font-medium text-foreground break-words">{actions[0].description}</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-4 text-sm font-medium text-foreground">
              {actions.map((action) => (
                <li key={action.pendingActionId} className="break-words">
                  {action.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(CONFIRM_TEXT)}
          className="inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {CONFIRM_TEXT}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(CANCEL_TEXT)}
          className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {CANCEL_TEXT}
        </button>
      </div>
    </div>
  );
}
