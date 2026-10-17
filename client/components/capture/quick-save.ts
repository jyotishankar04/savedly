"use client";

import { toast } from "@/components/ui/toast";
import { DuplicateSkippedError, useCreateMemoryMutation, useDeleteMemoryMutation } from "@/context/MemoryContext";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { deriveTitle, detectMemoryType, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { uploadFile } from "@/lib/uploads";

/** Something to save without opening Quick Capture: copied text (a link or a note), or a file. */
export type QuickSaveInput = { text: string } | { file: File };

/** A pasted screenshot arrives as "image.png"; name it by when it was saved instead (the AI retitles it anyway). */
function fileTitle(file: File) {
  if (!/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)) return deriveTitle("image", "", file.name);
  const when = new Date().toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return `Screenshot, ${when}`;
}

/**
 * Saves straight away, the way Quick Capture would, and says so in a toast
 * with Undo, which removes the save completely. Used by paste-to-save and
 * drop-to-save. Duplicates are asked about as usual, and plan limits apply.
 */
export function useQuickSave() {
  const create = useCreateMemoryMutation();
  const remove = useDeleteMemoryMutation();
  const memoryLimit = usePlanLimit("memory_count");
  const storageLimit = usePlanLimit("storage_mb");

  return async (input: QuickSaveInput) => {
    const id = toast.loading("Saving…");
    try {
      if (memoryLimit.isAtLimit) throw new Error(memoryLimit.message ?? "You've reached your memory limit.");
      let payload;
      if ("file" in input) {
        if (storageLimit.isAtLimit) throw new Error(storageLimit.message ?? "You've reached your storage limit.");
        const attachment = await uploadFile(input.file);
        payload = { type: detectMemoryType({ text: "", attachmentMimeType: input.file.type }), title: fileTitle(input.file), attachments: [attachment] };
      } else {
        const text = input.text.trim();
        const type = detectMemoryType({ text });
        const isLink = type === "web" || type === "video";
        // A link copied with words around it: the link is the save, the words its caption.
        const { url, caption } = splitLinkAndCaption(text);
        payload = { type, title: deriveTitle(type, text), url: isLink ? url?.href : undefined, content: isLink ? caption || undefined : text };
      }
      const memory = await create.mutateAsync(payload);
      toast.update(id, {
        title: `Saved “${memory.title}”`,
        type: "success",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: (toastId) => {
            toast.update(toastId, { title: "Removing…", type: "loading", action: undefined });
            remove.mutateAsync(memory.id).then(
              () => toast.update(toastId, { title: "Removed.", type: "success" }),
              (err) => toast.update(toastId, { title: err instanceof Error ? err.message : "Couldn't remove it.", type: "error" }),
            );
          },
        },
      });
    } catch (err) {
      if (err instanceof DuplicateSkippedError) toast.update(id, { title: "Not saved. It's already in your library.", type: "info" });
      else toast.update(id, { title: err instanceof Error ? err.message : "Couldn't save that.", type: "error" });
    }
  };
}

/** Whether an event's target is somewhere typing or pasting already means something. */
export function isEditableTarget(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  return Boolean(el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"]'));
}
