"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, ArrowRight01Icon as ArrowRight, XIcon as X } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { getActiveWhatsNew, type WhatsNewCardData } from "@/lib/whats-new";
import { WhatsNewCard } from "./whats-new-card";

const SEEN_KEY = "sfl:whats-new-seen";
const OPEN_AFTER_MS = 900;

/** Changes whenever a card is added, removed, reordered or edited, so the popup shows again. */
function signatureOf(items: WhatsNewCardData[]): string {
  return items.map((item) => `${item.id}@${item.updatedAt}`).join("|");
}

function hasSeen(signature: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === signature;
  } catch {
    return false;
  }
}

function markSeen(signature: string): void {
  try {
    localStorage.setItem(SEEN_KEY, signature);
  } catch {
    // Private mode: it shows again next visit.
  }
}

/**
 * The deck itself: one card in front, the rest peeking out behind it as a
 * stack, with Back and Next to move through them. Controlled, so the admin
 * page can open it as a preview with whatever cards it likes.
 */
export function WhatsNewDeck({ items, open, onOpenChange }: { items: WhatsNewCardData[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const reduceMotion = useReducedMotion();
  const [position, setPosition] = useState({ index: 0, direction: 1 });
  // A card can be removed while the deck is open (admin preview).
  const index = Math.min(position.index, Math.max(items.length - 1, 0));
  const item = items[index];
  const isLast = index === items.length - 1;
  const behind = Math.min(items.length - 1 - index, 2);

  const go = (delta: number) => setPosition({ index: Math.max(0, Math.min(items.length - 1, index + delta)), direction: delta });
  const close = () => onOpenChange(false);

  if (!item) return null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setPosition({ index: 0, direction: 1 });
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          aria-label="What's new in Savedly"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(1);
            if (event.key === "ArrowLeft") go(-1);
          }}
          className="fixed top-1/2 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">What&apos;s new in Savedly</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {items.length === 1 ? "One update." : `${items.length} updates. Use Next and Back to move through them.`}
          </DialogPrimitive.Description>

          <div className="relative">
            {/* The cards still to come, peeking out below the one in front. */}
            {Array.from({ length: behind }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-16 rounded-3xl border border-border/70 bg-card shadow-lg transition-all duration-300"
                style={{ transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.045})`, opacity: 1 - (i + 1) * 0.3, zIndex: -1 - i }}
              />
            ))}

            <div className="relative flex max-h-[min(86dvh,44rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card text-card-foreground shadow-2xl">
              <DialogPrimitive.Close
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <HugeiconsIcon icon={X} strokeWidth={2.25} className="h-4 w-4" />
              </DialogPrimitive.Close>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <AnimatePresence mode="wait" initial={false} custom={position.direction}>
                  <motion.div
                    key={item.id}
                    custom={position.direction}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: position.direction * 28 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: position.direction * -28, transition: { duration: 0.14 } }}
                  >
                    <WhatsNewCard item={item} onAction={close} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
                >
                  <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" />
                  Back
                </button>

                {items.length > 1 && (
                  <div className="flex items-center gap-1.5" aria-label={`${index + 1} of ${items.length}`}>
                    {items.map((entry, i) => (
                      <button
                        key={entry.id}
                        type="button"
                        aria-label={`Go to update ${i + 1}`}
                        aria-current={i === index ? "step" : undefined}
                        onClick={() => setPosition({ index: i, direction: i > index ? 1 : -1 })}
                        className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60")}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => (isLast ? close() : go(1))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/85"
                >
                  {isLast ? "Got it" : "Next"}
                  {!isLast && <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Shows the active "What's new" cards once, shortly after the landing page
 * loads. Closing it remembers this exact set of cards, so it stays away
 * until an admin adds or changes one.
 */
export function WhatsNewPopup() {
  const { data: items } = useQuery({ queryKey: ["whats-new", "active"], queryFn: getActiveWhatsNew, staleTime: 5 * 60 * 1000, retry: false });
  const [open, setOpen] = useState(false);
  const signature = items && items.length > 0 ? signatureOf(items) : null;

  useEffect(() => {
    if (!signature || hasSeen(signature)) return;
    const timer = setTimeout(() => setOpen(true), OPEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [signature]);

  if (!items || items.length === 0) return null;

  return (
    <WhatsNewDeck
      items={items}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && signature) markSeen(signature);
      }}
    />
  );
}
