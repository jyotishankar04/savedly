"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon as ArrowDown, ArrowUp01Icon as ArrowUp, Delete02Icon as Trash } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_TYPES, blockProblem, type BlockType, type DraftBlock } from "./draft";
import { Section, TonePicker } from "./fields";

const MAX_BLOCKS = 20;

/** The email's body: each block's fields, with move and remove, and the buttons that add one. */
export function BlocksSection({
  blocks,
  onChange,
  onAdd,
  onRemove,
  onMove,
}: {
  blocks: DraftBlock[];
  onChange: (id: string, fields: Partial<DraftBlock>) => void;
  onAdd: (type: BlockType) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: number) => void;
}) {
  return (
          <Section title="Content" description="Blocks appear in the email in this order.">
            {blocks.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No blocks yet. Add one below.</p>}

            {blocks.map((block, index) => {
              const meta = BLOCK_TYPES.find((entry) => entry.type === block.type)!;
              const issue = blockProblem(block);
              return (
                <div key={block.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <HugeiconsIcon icon={meta.icon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
                      {meta.name}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${meta.name} up`} disabled={index === 0} onClick={() => onMove(index, -1)}>
                        <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${meta.name} down`} disabled={index === blocks.length - 1} onClick={() => onMove(index, 1)}>
                        <HugeiconsIcon icon={ArrowDown} strokeWidth={2.25} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${meta.name}`} onClick={() => onRemove(block.id)} className="hover:bg-destructive/10 hover:text-destructive">
                        <HugeiconsIcon icon={Trash} strokeWidth={2} />
                      </Button>
                    </span>
                  </div>

                  {block.type === "text" && (
                    <Textarea aria-label="Text" value={block.text} rows={3} maxLength={4000} onChange={(e) => onChange(block.id, { text: e.target.value })} placeholder="Write a paragraph. Leave a blank line to start a new one." />
                  )}
                  {block.type === "bullets" && (
                    <Textarea aria-label="Bullet points" value={block.items} rows={3} onChange={(e) => onChange(block.id, { items: e.target.value })} placeholder={"One point per line\nUp to 12 points"} />
                  )}
                  {block.type === "button" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Button label" value={block.label} maxLength={60} onChange={(e) => onChange(block.id, { label: e.target.value })} placeholder="Button label" />
                      <Input aria-label="Button link" value={block.url} onChange={(e) => onChange(block.id, { url: e.target.value })} placeholder="/app/capture or https://…" />
                    </div>
                  )}
                  {block.type === "note" && (
                    <div className="space-y-2">
                      <Textarea aria-label="Note" value={block.text} rows={2} maxLength={1000} onChange={(e) => onChange(block.id, { text: e.target.value })} placeholder="Something to set apart: a date, a warning, a tip." />
                      <TonePicker value={block.tone} onChange={(tone) => onChange(block.id, { tone })} label="Note colour" />
                    </div>
                  )}
                  {block.type === "image" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Image address" value={block.url} onChange={(e) => onChange(block.id, { url: e.target.value })} placeholder="https://… (an image address)" />
                      <Input aria-label="Image description" value={block.alt} maxLength={200} onChange={(e) => onChange(block.id, { alt: e.target.value })} placeholder="Describe it, for people who can't see it" />
                    </div>
                  )}
                  {block.type === "divider" && <p className="text-[11px] text-muted-foreground">A thin line between sections.</p>}

                  {issue && <p className="mt-2 text-[11px] text-destructive">{issue}</p>}
                </div>
              );
            })}

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Add a block</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_TYPES.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    title={entry.hint}
                    disabled={blocks.length >= MAX_BLOCKS}
                    onClick={() => onAdd(entry.type)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40"
                  >
                    <HugeiconsIcon icon={entry.icon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          </Section>
  );
}
