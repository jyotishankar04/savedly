"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ComputerIcon as Desktop, SmartPhone01Icon as Phone } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export type PreviewDevice = "desktop" | "phone";

/** The server's own rendering of the email, in a frame that is desktop or phone wide. */
export function PreviewPane({
  subject,
  previewing,
  device,
  onDeviceChange,
  hasContent,
  html,
  error,
}: {
  subject: string;
  previewing: boolean;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  hasContent: boolean;
  html: string | null;
  error: string | null;
}) {
  return (
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{subject.trim() || "Your subject"}</p>
                <p className="text-[11px] text-muted-foreground">{previewing ? "Updating…" : "Preview"}</p>
              </div>
              <div role="radiogroup" aria-label="Preview size" className="flex shrink-0 rounded-full border border-border p-0.5">
                {[
                  { value: "desktop" as const, name: "Desktop", icon: Desktop },
                  { value: "phone" as const, name: "Phone", icon: Phone },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={device === option.value}
                    aria-label={option.name}
                    title={option.name}
                    onClick={() => onDeviceChange(option.value)}
                    className={cn("flex h-7 w-8 items-center justify-center rounded-full transition-colors", device === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <HugeiconsIcon icon={option.icon} strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center bg-muted/40 p-3">
              {!hasContent ? (
                <div className="flex h-[32rem] w-full items-center justify-center text-center">
                  <p className="max-w-[14rem] text-xs leading-relaxed text-muted-foreground">Add some content and the email appears here as you type.</p>
                </div>
              ) : error && !html ? (
                <div className="flex h-[32rem] w-full items-center justify-center text-center">
                  <p className="max-w-[16rem] text-xs leading-relaxed text-destructive">{error}</p>
                </div>
              ) : (
                <iframe
                  title="Email preview"
                  // Rendered by the server from the same template the mail uses.
                  // Sandboxed: an email has no scripts, and nothing in it should run.
                  sandbox=""
                  srcDoc={html ?? ""}
                  className={cn("h-[40rem] rounded-lg border border-border bg-white transition-[width] duration-300", device === "phone" ? "w-[375px]" : "w-full")}
                />
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Links are live in the real email. &ldquo;Send me a test&rdquo; delivers this exact email to your own address.
          </p>
        </div>
  );
}
