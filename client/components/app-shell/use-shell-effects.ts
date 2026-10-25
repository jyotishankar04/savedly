"use client";

import { useEffect, useRef } from "react";
import { isEditableTarget, useQuickSave } from "@/components/capture/quick-save";
import { useLockVaultMutation } from "@/hooks/use-vault";

/**
 * Leaving /app/vault for any other page locks it — this lives in the shell
 * rather than in the vault page itself because the shell persists across every
 * /app/* navigation, so a real route change is the only thing that can
 * trigger it. An unmount-cleanup on the vault page would also fire once,
 * synthetically, from React's StrictMode double-invoke in development,
 * re-locking the vault the instant that page first mounts.
 */
export function useLockVaultOnLeave(pathname: string) {
  const lockVaultMutation = useLockVaultMutation();
  const lockVaultRef = useRef(lockVaultMutation.mutate);
  useEffect(() => {
    lockVaultRef.current = lockVaultMutation.mutate;
  });
  const previousPathnameRef = useRef(pathname);
  useEffect(() => {
    if (previousPathnameRef.current === "/app/vault" && pathname !== "/app/vault") {
      lockVaultRef.current();
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);
}

/**
 * Paste anywhere to save: a link, some text or a screenshot pasted while no
 * text box has focus (and nothing is open on top) is saved straight away.
 */
export function usePasteToSave() {
  const quickSave = useQuickSave();
  const quickSaveRef = useRef(quickSave);
  useEffect(() => {
    quickSaveRef.current = quickSave;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const file = Array.from(e.clipboardData?.files ?? [])[0];
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!file && !text.trim()) return;
      e.preventDefault();
      void quickSaveRef.current(file ? { file } : { text });
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);
}
