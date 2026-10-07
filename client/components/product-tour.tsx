"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useNextStep } from "nextstepjs";
import type { Tour, CardComponentProps } from "nextstepjs";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export const PRODUCT_TOUR_NAME = "main-tour";

/**
 * Manual "retake the tour" trigger (e.g. from Settings > Help). The tour's
 * first step lives on /app, so this navigates there first if needed — the
 * first step's selectorRetryAttempts covers the render delay that follows.
 */
export function useRestartTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { startNextStep } = useNextStep();

  return useCallback(() => {
    if (pathname !== "/app") {
      router.push("/app");
    }
    startNextStep(PRODUCT_TOUR_NAME);
  }, [pathname, router, startNextStep]);
}

/**
 * The whole-app walkthrough shown the first time a user reaches /app.
 * Each step's `nextRoute` is where nextstepjs navigates to when the user
 * advances past that step — that's what makes the tour cross pages instead
 * of staying pinned to wherever it started.
 */
export const productTourSteps: Tour[] = [
  {
    tour: PRODUCT_TOUR_NAME,
    steps: [
      {
        title: "Welcome to Savedly",
        content: "This is your home base — quick capture, smart search, and everything you've saved, all in one place. Let's take a quick look around.",
        selector: '[data-tour="greeting"]',
        side: "bottom",
        // Covers a manual replay from Settings > Help, which navigates to
        // /app right before starting the tour — the target needs a moment
        // to mount after that route change.
        selectorRetryAttempts: 5,
        selectorRetryDelay: 200,
      },
      {
        title: "Save anything, instantly",
        content: "Paste a link, jot a note, or drop a file — Quick Capture is always one click away, wherever you are in the app.",
        selector: '[data-tour="quick-capture-btn"]',
        side: "right",
      },
      {
        title: "Search by meaning, not keywords",
        content: "Describe what you remember — \"that recipe I saved last week\" — and Savedly finds it, even without the exact words.",
        selector: '[data-tour="home-search"]',
        side: "bottom",
      },
      {
        title: "Every memory, organized",
        content: "Every website, note, screenshot, and video you save shows up here, automatically tagged and easy to filter.",
        selector: '[data-tour="nav-memories"]',
        side: "right",
        nextRoute: "/app/memories",
        selectorRetryAttempts: 5,
        selectorRetryDelay: 200,
      },
      {
        title: "Browse and filter freely",
        content: "Search within your memories, filter by type or tag, and jump back into anything you've saved.",
        selector: '[data-tour="memories-header"]',
        side: "bottom",
        nextRoute: "/app/collections",
        selectorRetryAttempts: 5,
        selectorRetryDelay: 200,
      },
      {
        title: "Group related memories",
        content: "Collections let you bundle memories around a project, trip, or topic — so related things stay together.",
        selector: '[data-tour="collections-header"]',
        side: "bottom",
        nextRoute: "/app/ask",
        selectorRetryAttempts: 5,
        selectorRetryDelay: 200,
      },
      {
        title: "Ask your memory a question",
        content: "Savedly connects the dots across everything you've saved and answers grounded in your own memories.",
        selector: '[data-tour="ask-header"]',
        side: "bottom",
        selectorRetryAttempts: 5,
        selectorRetryDelay: 200,
      },
      {
        title: "One more thing",
        content: "Collapse the sidebar anytime for more room — or press Ctrl+B. Ctrl+M brings up a quick menu when it's collapsed.",
        selector: '[data-tour="sidebar-collapse-btn"]',
        side: "right",
      },
    ],
  },
];

/** Starts the tour once per user, the first time they land in /app. */
export function TourAutoStart({ userId }: { userId: string }) {
  const { startNextStep } = useNextStep();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // The tour points at the sidebar and header, which a phone doesn't show:
    // there it would dim the screen and block taps on things that aren't
    // visible. Not marked as seen, so it still runs on a wider screen later.
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const key = `savedly:tour-seen:${userId}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    startNextStep(PRODUCT_TOUR_NAME);
    // Only ever run once per mount — re-running on every render would
    // re-trigger the tour whenever unrelated state in the shell changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Tour card matching the app's own card/button styling instead of nextstepjs's unthemed default. */
export function TourCard({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: CardComponentProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{step.title}</h2>
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground font-mono">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.content}</p>

      <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={skipTour}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevStep}
            disabled={isFirst}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-full border border-border text-foreground transition-colors",
              isFirst ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
            )}
            aria-label="Previous step"
          >
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3.5 flex items-center gap-1 hover:bg-primary/90 transition-colors"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {arrow}
    </div>
  );
}
