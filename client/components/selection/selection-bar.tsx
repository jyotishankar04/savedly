"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Cancel01Icon as Close } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ButtonGroup } from "@/components/arc/button-group/button-group";
import { toast } from "@/components/ui/toast";
import { openUpgradeDialog } from "@/components/upgrade-dialog";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import type { Selection } from "@/hooks/use-selection";
import { Cancelled } from "@/components/selection/pickers";
import { cn } from "@/lib/utils";

/** What an action did: the toast's text, and how to take it back, when it can be. */
export interface ActionOutcome {
  message: string;
  /** Reverses exactly what the action changed; resolves to the toast's new text. */
  undo?: () => Promise<string>;
}

/** How long a toast with Undo stays, so there is time to reach for it. */
const UNDO_WINDOW_MS = 8000;

/** The toast after an action: with an Undo button that turns it into "Undoing…" and then the result, in place. */
export function announceOutcome(outcome: string | ActionOutcome) {
  const { message, undo } = typeof outcome === "string" ? { message: outcome, undo: undefined } : outcome;
  if (!undo) {
    toast.add({ title: message, type: "success" });
    return;
  }
  toast.add({
    title: message,
    type: "success",
    duration: UNDO_WINDOW_MS,
    action: {
      label: "Undo",
      onClick: (id) => {
        toast.update(id, { title: "Undoing…", type: "loading", action: undefined });
        undo().then(
          (done) => toast.update(id, { title: done, type: "success" }),
          (err) => toast.update(id, { title: err instanceof Error ? err.message : "Couldn't undo that.", type: "error" }),
        );
      },
    },
  });
}

export interface SelectionAction {
  key: string;
  label: string;
  icon: IconSvgElement;
  /** Runs the action. Resolve to the toast's text, with an undo when it can be reversed; throw to show the error. */
  run: () => Promise<string | ActionOutcome | void>;
  destructive?: boolean;
  /** Ask first, with this wording. */
  confirm?: { title: string; description: string; confirmLabel: string };
  /** Put it in the More menu rather than the row. Destructive actions always go there. */
  inMenu?: boolean;
}

/** How many actions show as segments of the row before the rest go into More. */
const ROW_ACTIONS = 4;

/**
 * The bar that floats at the bottom of a list while something is selected:
 * how many, Select all, the page's actions, and clear. Bulk actions are a
 * Lite+ feature (batchOperations), so on Free an action opens the plan picker
 * instead of running; selecting itself works on every plan.
 */
export function SelectionBar({ selection, noun, actions }: { selection: Selection; noun: [string, string]; actions: SelectionAction[] }) {
  const reduced = useReducedMotion();
  const bulk = usePlanFeature("batchOperations");
  const [running, setRunning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SelectionAction | null>(null);

  const start = async (action: SelectionAction) => {
    if (!bulk.allowed) {
      openUpgradeDialog();
      return;
    }
    setRunning(action.key);
    try {
      const outcome = await action.run();
      if (outcome) announceOutcome(outcome);
      selection.clear();
    } catch (err) {
      // A picker dismissed: nothing happened, and the selection stays.
      if (err instanceof Cancelled) return;
      toast.add({
        title: err instanceof Error ? err.message : "That didn't work. Try again.",
        type: "error",
      });
    } finally {
      setRunning(null);
    }
  };

  const onAction = (action: SelectionAction) => {
    if (action.confirm && bulk.allowed) setConfirming(action);
    else void start(action);
  };

  // The common actions as segments of the group; the rest, and anything
  // destructive, in its More menu, one step away from a stray click.
  const rowActions = actions.filter((a) => !a.destructive && !a.inMenu).slice(0, ROW_ACTIONS);
  const menuActions = actions.filter((a) => !rowActions.includes(a));

  const label = selection.count === 0 ? `Select ${noun[1]}` : `${selection.count} ${selection.count === 1 ? noun[0] : noun[1]} selected`;

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <AnimatePresence>
        {selection.isSelecting && (
          <motion.div
            role="toolbar"
            aria-label={label}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, x: "-50%" }}
            animate={reduced ? { opacity: 1, x: "-50%" } : { opacity: 1, y: 0, x: "-50%" }}
            exit={
              reduced
                ? { opacity: 0, x: "-50%" }
                : {
                    opacity: 0,
                    y: 16,
                    x: "-50%",
                    transition: { duration: 0.15 },
                  }
            }
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            // On a phone the count and Clear take the top line and the actions get the full width below it.
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 rounded-2xl sm:w-auto sm:max-w-[calc(100vw-1.5rem)] sm:flex-nowrap bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/20 ring-1 ring-foreground/10 md:bottom-6"
          >
            <div className="order-1 flex min-w-0 flex-1 items-center gap-2 pr-1.5 pl-2.5 sm:flex-none sm:shrink-0">
              <span className="text-[13px] font-medium whitespace-nowrap tabular-nums">{label}</span>
              {selection.count < selection.total && (
                <button type="button" onClick={selection.selectAll} className="text-[13px] font-medium whitespace-nowrap text-primary hover:underline">
                  Select all {selection.total}
                </button>
              )}
            </div>
            <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border sm:order-2 sm:block" />
            <div className="order-3 flex min-w-0 basis-full justify-center sm:basis-auto">
              <ButtonGroup
                label="Bulk actions"
                size="sm"
                disabled={running !== null || selection.count === 0}
                className="min-w-0"
                items={rowActions.map((action) => ({
                  id: action.key,
                  label: action.label,
                  icon: running === action.key ? <Spinner className="h-4 w-4" /> : <HugeiconsIcon icon={action.icon} strokeWidth={2} />,
                  onSelect: () => onAction(action),
                }))}
                menu={
                  menuActions.length > 0
                    ? {
                        label: "More actions",
                        items: menuActions.map((action) => ({
                          id: action.key,
                          label: action.label,
                          icon: <HugeiconsIcon icon={action.icon} strokeWidth={2} />,
                          destructive: action.destructive,
                          onSelect: () => onAction(action),
                        })),
                      }
                    : undefined
                }
              />
            </div>
            <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border sm:order-4 sm:block" />
            <button
              type="button"
              onClick={selection.clear}
              aria-label="Clear selection (Esc)"
              title="Clear selection (Esc)"
              className="order-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground sm:order-5"
            >
              <HugeiconsIcon icon={Close} strokeWidth={2} className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming?.confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirming?.confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(confirming?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => {
                const action = confirming;
                setConfirming(null);
                if (action) void start(action);
              }}
            >
              {confirming?.confirm?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body,
  );
}

/** The header button that starts selecting (and ends it again). */
export function SelectButton({ selection, className }: { selection: Selection; className?: string }) {
  return (
    <button
      type="button"
      onClick={selection.isSelecting ? selection.clear : selection.start}
      aria-pressed={selection.isSelecting}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-medium ring-1 transition-colors",
        selection.isSelecting
          ? "bg-primary/10 text-primary ring-primary/25"
          : "text-muted-foreground ring-border hover:bg-[var(--hover)] hover:text-foreground",
        className,
      )}
    >
      {selection.isSelecting ? "Done" : "Select"}
    </button>
  );
}
