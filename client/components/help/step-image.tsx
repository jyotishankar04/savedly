"use client";

import React from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** A guide screenshot that opens larger on click, so small UI details are readable. */
export function StepImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`View larger: ${alt}`}
            className="group mt-5 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted/30 transition-shadow hover:shadow-md hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
          />
        }
      >
        <Image src={src} alt={alt} width={1200} height={675} className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.01]" />
      </DialogTrigger>
      <DialogContent className="max-w-[min(72rem,94vw)] sm:max-w-[min(72rem,94vw)] p-2">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <Image src={src} alt={alt} width={1200} height={675} className="h-auto w-full rounded-lg" />
      </DialogContent>
    </Dialog>
  );
}
