"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SlidersHorizontalIcon as Sliders } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

/** STEP 4: Organization mode */
export function StepOrganize({
  orgMode,
  setOrgMode,
  selfHosted,
  onBack,
  onContinue,
}: {
  orgMode: "auto" | "manual";
  setOrgMode: (mode: "auto" | "manual") => void;
  selfHosted: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">
                How should Savedly organize your memories?
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Savedly can understand what you save and organize it without folders or manual tags.
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              
              {/* Option 1: Automatic */}
              <div
                onClick={() => setOrgMode("auto")}
                className={cn(
                  "rounded-xl border p-0.5 cursor-pointer transition-all duration-200 select-none",
                  orgMode === "auto" 
                    ? "border-primary/40 bg-primary/5 shadow-xs" 
                    : "border-border/45 bg-muted/75 dark:border-border/65"
                )}
              >
                <div
                  className={cn(
                    "p-4 rounded-lg border bg-card flex items-center justify-between transition-colors relative",
                    orgMode === "auto" ? "border-primary/50 shadow-xs" : "border-border/75"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-1 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                      <LogoMark ticks={false} className="h-[18px] w-[18px]" />
                    </div>
                    <div className="pr-6">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground">Automatically</h4>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                        Let Savedly understand and organize everything for you. No tags or folders to maintain.
                        {selfHosted ? " Needs an AI key, which you can connect after setup." : ""}
                      </p>
                    </div>
                  </div>

                  <div 
                    className="h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0"
                    style={{ 
                      borderColor: orgMode === "auto" ? "var(--color-primary)" : "var(--color-border)",
                    }}
                  >
                    {orgMode === "auto" && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Manual */}
              <div
                onClick={() => setOrgMode("manual")}
                className={cn(
                  "rounded-xl border p-0.5 cursor-pointer transition-all duration-200 select-none",
                  orgMode === "manual" 
                    ? "border-primary/40 bg-primary/5 shadow-xs" 
                    : "border-border/45 bg-muted/75 dark:border-border/65"
                )}
              >
                <div
                  className={cn(
                    "p-4 rounded-lg border bg-card flex items-center justify-between transition-colors",
                    orgMode === "manual" ? "border-primary/50 shadow-xs" : "border-border/75"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-1 rounded-lg bg-muted text-muted-foreground mt-0.5 shrink-0">
                      <HugeiconsIcon icon={Sliders} strokeWidth={2.25} className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">My way</h4>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                        I&apos;ll organize things myself. I prefer manual folder hierarchies and manual tag collections.
                      </p>
                    </div>
                  </div>

                  <div 
                    className="h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0"
                    style={{ 
                      borderColor: orgMode === "manual" ? "var(--color-primary)" : "var(--color-border)",
                    }}
                  >
                    {orgMode === "manual" && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 max-w-md mx-auto">
              <Button variant="ghost" onClick={onBack} className="flex-1 h-11 rounded-full font-medium">
                Back
              </Button>
              <Button 
                onClick={onContinue} 
                className="flex-1 h-11 rounded-full font-medium shadow-xs"
              >
                Continue
              </Button>
            </div>
          </div>
  );
}
