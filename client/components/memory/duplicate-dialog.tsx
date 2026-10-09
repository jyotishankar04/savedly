"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useNextStep } from "nextstepjs";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { duplicatePromptStore } from "@/lib/duplicate-prompt";
import { resolveDuplicate } from "@/lib/memories";
import { duplicateDetectedRefs, type AppNotification } from "@/lib/notifications";

/**
 * "This is already in your library": the one dialog for both moments a
 * duplicate is found. Before a save from the app (nothing is saved until the
 * user answers), and after a save made elsewhere, from its notification.
 */
function DuplicateDialog({
  title,
  detail,
  existingId,
  existingTitle,
  addLabel,
  busy,
  onAdd,
  onSkip,
  onDismiss,
}: {
  title: string;
  detail: string;
  existingId: string;
  existingTitle: string;
  addLabel: string;
  busy?: boolean;
  onAdd: () => void;
  onSkip: () => void;
  /** Escape, or opening the saved one: closing without choosing. Must never remove anything. */
  onDismiss: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{detail}</AlertDialogDescription>
        </AlertDialogHeader>
        <Link
          href={`/app/memories/${existingId}`}
          onClick={onDismiss}
          className="block truncate rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {existingTitle}
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Open the one you saved</span>
        </Link>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onAdd} disabled={busy}>
            {addLabel}
          </Button>
          <Button onClick={onSkip} disabled={busy} autoFocus>
            Skip
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Mounted once in the app shell: asks about a duplicate found while saving. */
export function DuplicateAskHost() {
  const pending = useSyncExternalStore(duplicatePromptStore.subscribe, duplicatePromptStore.get, () => null);
  if (!pending) return null;
  const saved = new Date(pending.existing.createdAt);
  const today = saved.toDateString() === new Date().toDateString();
  const when = today ? "earlier today" : `on ${saved.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;
  return (
    <DuplicateDialog
      title={pending.kind === "note" ? "You already saved this note" : "You already saved this link"}
      detail={`You saved it ${when}. Skip it, or add a second copy.`}
      existingId={pending.existing.id}
      existingTitle={pending.existing.title}
      addLabel="Add anyway"
      onAdd={() => pending.answer("add")}
      onSkip={() => pending.answer("skip")}
      // Nothing has been saved yet, so closing is the same as skipping.
      onDismiss={() => pending.answer("skip")}
    />
  );
}

/** Answers a "duplicate detected" notification: skip removes the new copy, add keeps both. */
export function useResolveDuplicate(notification: AppNotification, onDone?: () => void) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refs = duplicateDetectedRefs(notification);

  const resolve = async (action: "skip" | "keep") => {
    if (!refs) return;
    setBusy(true);
    try {
      await resolveDuplicate(refs.memoryId, action);
      toast.add({
        title: action === "skip" ? "New copy removed" : "Kept both",
        description: action === "skip" ? "It's in Trash if you change your mind." : undefined,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onDone?.();
    } catch (err) {
      toast.add({ title: "Couldn't do that", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return { refs, busy, resolve };
}

/** The popup shown when a duplicate arrives from somewhere else while the app is open. */
export function LiveDuplicatePopup({ notification, onClose }: { notification: AppNotification; onClose: () => void }) {
  const { isNextStepVisible } = useNextStep();
  const { refs, busy, resolve } = useResolveDuplicate(notification, onClose);
  // Not over the product tour; the notification is still there afterwards.
  if (!refs || isNextStepVisible) return null;
  return (
    <DuplicateDialog
      title="Duplicate detected"
      detail="Something you just saved is already in your library. Skip the new copy, or keep both."
      existingId={refs.duplicateOfId}
      existingTitle={refs.existingTitle}
      addLabel="Add"
      busy={busy}
      onAdd={() => resolve("keep")}
      onSkip={() => resolve("skip")}
      // The copy is already saved, so closing must not remove it: the
      // notification stays, and the question can be answered there later.
      onDismiss={() => {
        rememberDuplicatePopupDismissed(notification.id);
        onClose();
      }}
    />
  );
}

/** The same two answers, as buttons on the notification itself. */
export function InlineDuplicateAction({ notification }: { notification: AppNotification }) {
  const { refs, busy, resolve } = useResolveDuplicate(notification);
  // Once answered the notification is read; the buttons would do nothing more.
  if (!refs || notification.readAt) return null;
  return (
    <>
      <Button onClick={() => resolve("skip")} disabled={busy} className="h-9 rounded-full px-5 text-sm font-medium">
        Skip
      </Button>
      <Button variant="outline" onClick={() => resolve("keep")} disabled={busy} className="h-9 rounded-full px-5 text-sm font-medium">
        Add
      </Button>
    </>
  );
}

// A popup closed without an answer shouldn't come back on every page: it is
// remembered for this browser tab, and the notification keeps the question.
const DISMISSED_KEY = "sfl:duplicate-popups-dismissed";

function dismissedIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function wasDuplicatePopupDismissed(notificationId: string): boolean {
  return dismissedIds().includes(notificationId);
}

export function rememberDuplicatePopupDismissed(notificationId: string): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedIds(), notificationId].slice(-50)));
  } catch {
    // Private mode: it may pop up again after a reload, which is harmless.
  }
}
