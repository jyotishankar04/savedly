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
import { toast } from "@/components/ui/toast";
import { openUpgradeDialog } from "@/components/upgrade-dialog";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import type { Selection } from "@/hooks/use-selection";
import { Cancelled } from "@/components/selection/pickers";
import { cn } from "@/lib/utils";

export interface SelectionAction {
  key: string;
  label: string;
  icon: IconSvgElement;
  /** Runs the action. Resolve to the toast's text; throw to show the error. */
  run: () => Promise<string | void>;
  destructive?: boolean;
  /** Ask first, with this wording. */
  confirm?: { title: string; description: string; confirmLabel: string };
}

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
      const message = await action.run();
      if (message) toast.add({ title: message, type: "success" });
      selection.clear();
    } catch (err) {
      // A picker dismissed: nothing happened, and the selection stays.
      if (err instanceof Cancelled) return;
      toast.add({ title: err instanceof Error ? err.message : "That didn't work. Try again.", type: "error" });
    } finally {
      setRunning(null);
    }
  };

  const onAction = (action: SelectionAction) => {
    if (action.confirm && bulk.allowed) setConfirming(action);
    else void start(action);
  };

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
            exit={reduced ? { opacity: 0, x: "-50%" } : { opacity: 0, y: 16, x: "-50%", transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/20 ring-1 ring-foreground/10 md:bottom-6"
          >
            <div className="flex shrink-0 items-center gap-2 pr-1.5 pl-2.5">
              <span className="text-[13px] font-medium whitespace-nowrap tabular-nums">{label}</span>
              {selection.count < selection.total && (
                <button type="button" onClick={selection.selectAll} className="text-[13px] font-medium whitespace-nowrap text-primary hover:underline">
                  Select all {selection.total}
                </button>
              )}
            </div>
            <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled={running !== null || selection.count === 0}
                  onClick={() => onAction(action)}
                  title={action.label}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-50",
                    action.destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-[var(--hover)]",
                  )}
                >
                  {running === action.key ? <Spinner className="h-4 w-4" /> : <HugeiconsIcon icon={action.icon} strokeWidth={2} className="h-4 w-4" />}
                  <span className="max-sm:sr-only">{action.label}</span>
                </button>
              ))}
            </div>
            <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={selection.clear}
              aria-label="Clear selection (Esc)"
              title="Clear selection (Esc)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
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
        selection.isSelecting ? "bg-primary/10 text-primary ring-primary/25" : "text-muted-foreground ring-border hover:bg-[var(--hover)] hover:text-foreground",
        className,
      )}
    >
      {selection.isSelecting ? "Done" : "Select"}
    </button>
  );
}
