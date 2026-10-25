"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageAdd01Icon as ImageAdd } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The cover picture at the top of the post: shown with Change/Remove, or a drop target to add one. */
export function CoverField({
  cover,
  broken,
  busy,
  onBroken,
  onUpload,
  onRemove,
}: {
  cover: string;
  broken: boolean;
  busy: boolean;
  onBroken: () => void;
  onUpload: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return cover && !broken ? (
            <div className="group relative mb-6 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host */}
              <img src={cover} alt="" onError={onBroken} className="aspect-[16/7] w-full object-cover" />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <label className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer shadow-sm")}>
                  {busy ? "Uploading…" : "Change"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <Button variant="secondary" size="sm" className="shadow-sm" onClick={onRemove}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onUpload(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "mb-6 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <HugeiconsIcon icon={ImageAdd} strokeWidth={2} className="h-4 w-4" />
              {busy ? "Uploading the cover…" : broken ? "That cover image couldn't be loaded. Click to upload another." : "Add a cover image: click, or drop one here"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          );
}
