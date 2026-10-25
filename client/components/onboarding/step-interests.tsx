"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { interests } from "./onboarding-data";

/** STEP 2: What it's for (one tap each, or one for everything) */
export function StepInterests({
  useFor,
  setUseFor,
  onBack,
  onContinue,
}: {
  useFor: string[];
  setUseFor: React.Dispatch<React.SetStateAction<string[]>>;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                What will you use Savedly for?
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick any that fit. You can skip this.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
              {[...interests, { id: "all", label: "A bit of everything", desc: "All of the above", icon: "✨" }].map((item) => {
                const all = item.id === "all";
                const isSelected = all ? useFor.length === interests.length : useFor.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (all) {
                        setUseFor(isSelected ? [] : interests.map((i) => i.id));
                        return;
                      }
                      setUseFor((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                    }}
                    className={cn(
                      "relative flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isSelected
                        ? "border-primary/60 bg-primary/[0.07] shadow-xs"
                        : "border-border/70 bg-card hover:border-foreground/20 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>{item.icon}</span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                        isSelected ? "border-primary bg-primary text-primary-foreground scale-100" : "border-border scale-90",
                      )}
                    >
                      {isSelected && <HugeiconsIcon icon={Check} strokeWidth={3} className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={onBack} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button
                onClick={onContinue}
                variant={useFor.length ? "default" : "outline"}
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                {useFor.length ? "Continue" : "Skip"}
              </Button>
            </div>
          </div>
  );
}
