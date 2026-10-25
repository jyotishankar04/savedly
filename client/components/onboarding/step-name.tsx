"use client";

import React from "react";
import { Button } from "@/components/ui/button";

/** STEP 1: Name Input (No border, no ring) */
export function StepName({ name, setName, onContinue }: { name: string; setName: (name: string) => void; onContinue: () => void }) {
  return (
          <div className="w-full space-y-12 text-center animate-fade-in my-auto">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                Welcome to Savedly
              </span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground pt-2">
                What&apos;s your name?
              </h2>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-foreground text-center text-4xl md:text-5xl font-semibold border-none ring-0 outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 border border-border bg-muted rounded text-[9px] font-mono">Enter</kbd> to continue
              </p>
            </div>

            <Button
              onClick={onContinue}
              disabled={!name.trim()}
              className="w-full max-w-md h-12 rounded-full font-medium shadow-xs"
            >
              Continue
            </Button>
          </div>
  );
}
