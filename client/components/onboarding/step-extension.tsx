"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ChromeLogo } from "@/components/chrome-logo";
import type { useExtensionStatus } from "@/hooks/use-extension-status";
import { CHROME_WEB_STORE_URL } from "@/lib/extension";

/** STEP 6: The Chrome extension (desktop Chromium without it only) */
export function StepExtension({
  extensionStatus,
  extensionOpened,
  setExtensionOpened,
  onContinue,
}: {
  extensionStatus: ReturnType<typeof useExtensionStatus>;
  extensionOpened: boolean;
  setExtensionOpened: (opened: boolean) => void;
  onContinue: () => void;
}) {
  return (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight text-foreground">Save from any page</h2>
              <p className="text-sm text-muted-foreground">
                Add Savedly to Chrome, and saving is one click from wherever you are.
              </p>
            </div>

            <div className="mx-auto max-w-md overflow-hidden rounded-2xl ring-1 ring-foreground/10 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- an animated WebP loop */}
              <img src="/whats-new/loops/extension.webp" alt="The Savedly extension saving a page" className="aspect-[16/9] w-full object-cover object-top" />
            </div>

            <ul className="mx-auto max-w-md space-y-2 text-sm text-foreground">
              {["Save the page you're on, with a note and tags", "Right-click to save a link, some text or an image", "Take a screenshot of an area or the whole view"].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <HugeiconsIcon icon={Check} strokeWidth={2.25} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-2.5 max-w-md mx-auto pt-2">
              {extensionStatus === "installed" ? (
                <p className="text-sm font-medium text-primary">It&apos;s installed. You&apos;re all set.</p>
              ) : (
                <a
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setExtensionOpened(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                >
                  <ChromeLogo className="h-4 w-4 rounded-full ring-2 ring-white/90" />
                  Add to Chrome
                </a>
              )}
              {extensionOpened && (
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Once it&apos;s added, pin it from Chrome&apos;s puzzle-piece menu so it stays in the toolbar. It uses this sign-in.
                </p>
              )}
              <Button variant="ghost" onClick={onContinue} className="w-full h-11 rounded-full font-medium">
                {extensionOpened || extensionStatus === "installed" ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </div>
  );
}
