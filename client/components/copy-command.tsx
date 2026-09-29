"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon as Copy, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** A terminal command (or short config block) in mono, with a copy button. */
/** `wrap` breaks a long one-liner across lines instead of scrolling it (for narrow spots like a card). */
export function CopyCommand({ command, className, label, wrap = false }: { command: string; className?: string; label?: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the text stays selectable.
    }
  };

  return (
    <div className={cn("group relative rounded-xl bg-foreground/[0.04] ring-1 ring-foreground/10", className)}>
      {label && <div className="border-b border-foreground/10 px-4 py-2 text-xs font-medium text-muted-foreground">{label}</div>}
      <pre
        className={cn(
          "px-4 py-3 pr-12 font-mono text-[13px] leading-relaxed text-foreground",
          wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto",
        )}
      >
        <code>{command}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={cn(
          "absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
          label ? "top-[2.6rem]" : "top-2",
        )}
      >
        <HugeiconsIcon icon={copied ? Tick : Copy} strokeWidth={2} className={cn("h-4 w-4", copied && "text-primary")} />
      </button>
    </div>
  );
}
