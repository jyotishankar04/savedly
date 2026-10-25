"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMemories } from "@/context/MemoryContext";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { useCaptureDialog } from "@/components/app-shell/use-capture-dialog";
import { CaptureFlow } from "@/components/capture/capture-flow";

/**
 * What arrived with the URL: from the phone's share sheet (the manifest's
 * share_target) or any link with ?text= / ?url= / ?title=. Apps differ in
 * where they put the link — `url`, or inside `text` — so both are kept, and
 * splitLinkAndCaption sorts out which part is the link when saving.
 */
function sharedContent(params: URLSearchParams): { text: string; title: string; hasFile: boolean } {
  const text = params.get("text")?.trim() ?? "";
  const url = params.get("url")?.trim() ?? "";
  const title = params.get("title")?.trim() ?? "";
  return {
    text: [text, url && !text.includes(url) ? url : ""].filter(Boolean).join("\n"),
    // A shared title is only useful when it isn't just the link again.
    title: title && title !== url && title !== text ? title : "",
    // A shared photo or file is waiting where the service worker left it.
    hasFile: params.has("shared-file"),
  };
}

export default function CapturePage() {
  // useSearchParams (the shared content) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CapturePageContent />
    </Suspense>
  );
}

function CapturePageContent() {
  const [shared] = useState(sharedContent(useSearchParams()));
  const { collections, create } = useMemories();
  const memoryLimit = usePlanLimit("memory_count");
  const storageLimit = usePlanLimit("storage_mb");
  const capture = useCaptureDialog({ create, memoryLimit, storageLimit });
  const { setCaptureText, setCaptureTitle, dropzoneRef } = capture;

  // The shared values go into the form once, then leave the address bar so a
  // refresh or the back button doesn't fill the form in again.
  useEffect(() => {
    if (shared.text) setCaptureText(shared.text);
    if (shared.title) setCaptureTitle(shared.title);
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [shared, setCaptureText, setCaptureTitle]);

  // A photo or file shared to the installed app: the service worker
  // (public/sw.js) parked it in the Cache API, since a file can't travel in a
  // URL. It is handed to the dropzone as if it had been chosen there, so it
  // shows, uploads and can be removed like any other file.
  const sharedFileTaken = useRef(false);
  useEffect(() => {
    if (!shared.hasFile || sharedFileTaken.current || !("caches" in window)) return;
    sharedFileTaken.current = true;
    void (async () => {
      try {
        const cache = await caches.open("share-target");
        const response = await cache.match("/__shared-file");
        const picker = dropzoneRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
        if (!response || !picker) return;
        const blob = await response.blob();
        const name = decodeURIComponent(response.headers.get("X-File-Name") ?? "shared-file");
        await cache.delete("/__shared-file");
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], name, { type: blob.type }));
        picker.files = transfer.files;
        picker.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {
        // Nothing to take: the file can be attached from the form instead.
      }
    })();
  }, [shared, dropzoneRef]);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Quick Capture</h1>
        <p className="mt-1 text-xs text-muted-foreground">Paste a link, drop a file, or write a note.</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <CaptureFlow capture={capture} collections={collections} memoryLimit={memoryLimit} />
      </div>
    </div>
  );
}
