"use client";

import React from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDownIcon as ChevronDown, ChevronRightIcon as ChevronRight, GlobeIcon as Globe, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";
import { MemoryPreviewCard } from "@/components/memory-preview-card";
import { memoryQueryKey } from "@/context/MemoryContext";
import { getMemory } from "@/lib/memories";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { getCardDescription, parseToolOutput, type SearchMemoriesResult } from "@/lib/ask-results";
import type { MemoryType } from "@/types/memory";

function MemoryAttachmentCards({ memories }: { memories: SearchMemoriesResult["memories"] }) {
  return (
    <AttachmentGroup>
      {memories.map((memory) => {
        const TypeIcon = MEMORY_TYPE_ICONS[memory.type as MemoryType] ?? Globe;
        return (
          <Attachment key={memory.id} size="sm" className="w-56 sm:w-60">
            <AttachmentMedia variant="icon">
              <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{memory.title}</AttachmentTitle>
              <AttachmentDescription>{getCardDescription(memory)}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger render={<Link href={`/app/memories/${memory.id}`} />} />
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}

/** The search tool's result only carries a snippet-level shape (title,
 * source, favicon) — not the real memory card (thumbnail, tags, saved-at
 * time). Fetches each referenced memory's full record so "Referenced" can
 * render the same card design as the Memories grid, reusing the app's
 * existing per-memory cache (memoryQueryKey) rather than a one-off. */
export function ReferencedMemoryCards({ memories }: { memories: SearchMemoriesResult["memories"] }) {
  const results = useQueries({
    queries: memories.map((memory) => ({
      queryKey: memoryQueryKey(memory.id),
      queryFn: () => getMemory(memory.id),
      staleTime: 60_000,
    })),
  });

  return (
    <div className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-fade-x scrollbar-none py-1">
      {results.map((result, i) =>
        result.data ? (
          <MemoryPreviewCard key={memories[i].id} memory={result.data} />
        ) : (
          <div key={memories[i].id} className="h-32 w-40 sm:w-44 shrink-0 animate-pulse rounded-xl border border-border/45 bg-muted/40" />
        ),
      )}
    </div>
  );
}

/** Sources live in the normal flex flow (like the history sidebar), just
 * collapsed to a slim tab by default — a `position: fixed` overlay panel
 * sat on top of the chat instead of reserving its own space, so it clipped
 * message bubbles and forced a horizontal scrollbar at narrower widths
 * (confirmed live before this fix). Toggling still gives it the "floating"
 * look via the rounded/shadowed card inside the reserved column, it just
 * never overlaps content. */
export function SourcesPanel({
  memories,
  open,
  onToggle,
}: {
  memories: SearchMemoriesResult["memories"];
  open: boolean;
  onToggle: () => void;
}) {
  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="hidden lg:flex shrink-0 w-10 flex-col items-center gap-2 border-l border-border/20 py-6 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
      >
        <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-4 w-4" />
        <span className="text-[10px] font-semibold tracking-wider [writing-mode:vertical-rl] rotate-180">
          SOURCES
        </span>
      </button>
    );
  }

  return (
    <div className="hidden lg:flex shrink-0 w-72 flex-col h-full py-6 pr-4 pl-2">
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/20 bg-card shadow-sm p-3">
        <button onClick={onToggle} className="flex items-center justify-between shrink-0 mb-2 group">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sources</span>
          <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
        <ScrollArea className="flex-1 min-h-0" viewportClassName="pr-2">
          <div className="flex flex-col gap-2">
            {memories.map((memory) => {
              const TypeIcon = MEMORY_TYPE_ICONS[memory.type as MemoryType] ?? Globe;
              return (
                <Attachment key={memory.id} size="sm" className="w-full">
                  <AttachmentMedia variant="icon">
                    <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{memory.title}</AttachmentTitle>
                    <AttachmentDescription>{getCardDescription(memory)}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentTrigger render={<Link href={`/app/memories/${memory.id}`} />} />
                </Attachment>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function SearchToolPart({ part }: { part: Extract<UIMessage["parts"][number], { type: "dynamic-tool" }> }) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={Search} strokeWidth={2.25} />
        </MarkerIcon>
        <MarkerContent className="shimmer">Searching your memories&hellip;</MarkerContent>
      </Marker>
    );
  }

  if (part.state !== "output-available") return null;

  const result = parseToolOutput(part.output);
  if (!result) return null;

  if (result.memories.length === 0) {
    return (
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={Search} strokeWidth={2.25} />
        </MarkerIcon>
        <MarkerContent>No matching memories found for &ldquo;{result.query}&rdquo;</MarkerContent>
      </Marker>
    );
  }

  return (
    <Collapsible className="space-y-2">
      <CollapsibleTrigger
        render={
          <button className="w-full group/trigger">
            <Marker>
              <MarkerIcon>
                <HugeiconsIcon icon={Search} strokeWidth={2.25} />
              </MarkerIcon>
              <MarkerContent>
                Searched your memories for &ldquo;{result.query}&rdquo; &middot; {result.memories.length} found
              </MarkerContent>
              <HugeiconsIcon icon={ChevronDown} strokeWidth={2.25} className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180" />
            </Marker>
          </button>
        }
      />
      <CollapsibleContent>
        <MemoryAttachmentCards memories={result.memories} />
      </CollapsibleContent>
    </Collapsible>
  );
}
