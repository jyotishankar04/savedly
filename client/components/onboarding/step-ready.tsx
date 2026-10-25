"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon as ArrowRight, Key01Icon as Key } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

/** STEP 8: Ready */
export function StepReady({ selfHosted, onEnter }: { selfHosted: boolean; onEnter: () => void }) {
  return (
          <div className="my-auto w-full max-w-md text-center space-y-10 animate-fade-in flex flex-col items-center">
            
            {/* Minimal icon */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/25 rounded-full blur-xl animate-pulse" />
              <div className="w-14 h-14 rounded-2xl border border-primary/40 flex items-center justify-center bg-card shadow-md">
                <LogoMark className="h-9 w-9" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground">
                Your memory is ready.
              </h2>
              <div className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                <p>Save anything.</p>
                <p>Find everything.</p>
                <p className="font-semibold text-foreground">Never lose a good idea again.</p>
              </div>
            </div>

            <Button
              onClick={onEnter}
              className="w-full max-w-xs h-11 rounded-full font-medium flex items-center justify-center gap-1.5 shadow-md"
            >
              Enter Savedly <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
            </Button>

            {selfHosted && (
              <div className="w-full max-w-xs rounded-xl border border-border/60 bg-muted/20 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <HugeiconsIcon icon={Key} strokeWidth={2.25} className="h-4 w-4 text-primary" />
                  Turn on the smart features
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Summaries, auto-tags, and Ask need an AI key. Saving and keyword search work without one. If you run this install, the dashboard walks you through connecting it.
                </p>
                <div className="flex gap-3 text-[11px] font-medium">
                  <Link href="/app/settings/ai" className="text-primary hover:underline">Connect a key</Link>
                  <Link href="/help" className="text-muted-foreground hover:text-foreground hover:underline">Help Center</Link>
                </div>
              </div>
            )}
          </div>
  );
}
