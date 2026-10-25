"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, ArrowLeft01Icon as ArrowLeft, Cancel01Icon as Close, PlayIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { captureChannels } from "./onboarding-data";

/** STEP 5: Connect first way to save */
export function StepWaysToSave({
  preview,
  setPreview,
  onContinue,
}: {
  preview: number | null;
  setPreview: (index: number | null) => void;
  onContinue: () => void;
}) {
  return (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                Ways to save
              </h2>
              <p className="text-sm text-muted-foreground">
                Three quick ways to get things in — you can use any of them later.
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {captureChannels.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setPreview(idx)}
                    className="group w-full rounded-xl border border-border/45 bg-muted/75 p-0.5 text-left shadow-xs transition-all duration-200 hover:border-primary/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <div className="flex items-center gap-3 rounded-lg border border-border/75 bg-card p-3.5">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground leading-none">{item.label}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{item.desc}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <HugeiconsIcon icon={PlayIcon} strokeWidth={2.25} className="h-3 w-3" />
                        Watch
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 max-w-md mx-auto pt-4">
              <Button 
                onClick={onContinue} 
                className="w-full h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>

            <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
              {preview !== null && (
                <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
                  {/* Its own close button, on a solid circle so it shows over any clip. */}
                  <DialogClose
                    aria-label="Close"
                    className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-background max-md:top-9"
                  >
                    <HugeiconsIcon icon={Close} strokeWidth={2.25} className="h-4 w-4" />
                  </DialogClose>
                  <div className="aspect-[16/9] w-full overflow-hidden border-b border-border/60 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- an animated WebP loop */}
                    <img
                      key={captureChannels[preview].clip}
                      src={captureChannels[preview].clip}
                      alt={`${captureChannels[preview].label} in use`}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="space-y-2 p-5 sm:p-6">
                    <DialogTitle className="text-lg font-medium tracking-tight">{captureChannels[preview].label}</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                      {captureChannels[preview].about}
                    </DialogDescription>
                    <div className="flex items-center justify-between gap-3 pt-3">
                      <div className="flex gap-1.5" aria-hidden>
                        {captureChannels.map((c, i) => (
                          <span key={c.label} className={cn("h-1.5 rounded-full transition-all", i === preview ? "w-5 bg-primary" : "w-1.5 bg-border")} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled={preview === 0} onClick={() => setPreview(preview - 1)} className="rounded-full">
                          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
                          Previous
                        </Button>
                        {preview < captureChannels.length - 1 ? (
                          <Button size="sm" onClick={() => setPreview(preview + 1)} className="rounded-full">
                            Next
                            <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setPreview(null)} className="rounded-full">
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          </div>
  );
}
