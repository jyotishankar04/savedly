"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as Search, GlobeIcon, Video01Icon as Video } from "@hugeicons/core-free-icons";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { cn } from "@/lib/utils";

// A frozen frame, not a screenshot — built from the same primitives the
// real interactive ask-section.tsx (and the live /app/ask page) use, just
// without the composer/scripting logic. This is the one visual on the
// features-alternating row that isn't actually live (unlike the graph and
// vault previews next to it), so it's real UI, not a photo standing in
// for one.
const SOURCES = [
  { icon: GlobeIcon, title: "Synology vs. self-built TrueNAS: a real cost breakdown", detail: "eshop-nas-comparisons.dev" },
  { icon: Video, title: "Building a 6-bay ZFS NAS from scratch", detail: "YouTube — Level1Techs" },
];

export function AskPreviewCard({ className }: { className?: string }) {
  return (
    // border-border is invisible here in dark mode — checked app/globals.css:
    // --border and --card resolve to the exact same value (oklch(0.2393 0 0))
    // under .dark, so a bordered bg-card element gets no visible edge at all
    // against the page background. ring-foreground/10 doesn't depend on that
    // token relationship — it's visible in both themes regardless.
    <div
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <Message align="end">
          <MessageContent>
            <Bubble align="end">
              <BubbleContent>Did I ever decide on a NAS?</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>

        <Marker>
          <MarkerIcon>
            <HugeiconsIcon icon={Search} strokeWidth={2.25} />
          </MarkerIcon>
          <MarkerContent>Searched your memories · 2 found</MarkerContent>
        </Marker>

        <AttachmentGroup>
          {SOURCES.map((source) => (
            <Attachment key={source.title} size="sm" className="w-44">
              <AttachmentMedia variant="icon">
                <HugeiconsIcon icon={source.icon} strokeWidth={2.25} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{source.title}</AttachmentTitle>
                <AttachmentDescription>{source.detail}</AttachmentDescription>
              </AttachmentContent>
            </Attachment>
          ))}
        </AttachmentGroup>

        <Message align="start">
          <MessageContent>
            <Bubble align="start" variant="muted">
              <BubbleContent className="text-sm leading-relaxed">
                Not quite — the last thing you saved on it ends on &ldquo;price out drives before deciding.&rdquo;
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>
    </div>
  );
}

export default AskPreviewCard;
