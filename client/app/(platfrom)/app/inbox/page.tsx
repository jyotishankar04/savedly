"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlarmClockIcon as Alarm, CheckmarkCircle02Icon as Done, InboxIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useInboxCountQuery, useMarkInboxReadMutation, useMemoriesQuery } from "@/context/MemoryContext";
import { timeAgo, timelineGroup } from "@/lib/time";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { SiteIcon } from "@/components/memory/site-icon";
import { formatRemindAt } from "@/lib/remind";
import type { Memory } from "@/types/memory";
import { QueryErrorState } from "@/components/query-error-state";
import { cn } from "@/lib/utils";
import { MemorySelectionBar } from "@/components/selection/memory-selection-bar";
import { SelectButton } from "@/components/selection/selection-bar";
import { RowSelect, selectableProps } from "@/components/selection/select-checkbox";
import { useSelection, type Selection } from "@/hooks/use-selection";
import { PageHeader, EmptyState } from "@/components/app-page";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Button } from "@/components/arc/button/button";
import { useMarkRead, useRemindMe } from "@/components/memory/remind-me";
import { toast } from "@/components/ui/toast";

type Tab = "unread" | "snoozed";

/**
 * The Inbox: what you saved to read or watch and haven't yet. Opening one,
 * or marking it read, takes it out; "Remind me" snoozes it until a time, when
 * it comes back to the top. The Snoozed tab lists what's waiting.
 */
export default function InboxPage() {
  const [tab, setTab] = useState<Tab>("unread");
  const counts = useInboxCountQuery().data;
  const unreadQuery = useMemoriesQuery({ inbox: true, limit: 100 });
  const snoozedQuery = useMemoriesQuery({ snoozed: true, limit: 100 });
  const query = tab === "unread" ? unreadQuery : snoozedQuery;
  const items = query.data?.items ?? [];
  const selection = useSelection(items.map((m) => m.id));
  const readAll = useMarkInboxReadMutation();
  const remindMe = useRemindMe();
  const markRead = useMarkRead();

  // Reminders that came back first, then new saves by day.
  const groups: { label: string; items: Memory[] }[] = [];
  if (tab === "unread") {
    const returned = items.filter((m) => m.remindedAt);
    if (returned.length) groups.push({ label: "Back from a reminder", items: returned });
    for (const item of items.filter((m) => !m.remindedAt)) {
      const label = timelineGroup(item.createdAt);
      const group = groups.find((g) => g.label === label) ?? groups[groups.push({ label, items: [] }) - 1]!;
      group.items.push(item);
    }
  } else if (items.length) {
    groups.push({ label: "Coming back", items });
  }

  const markAllRead = async () => {
    try {
      const { marked } = await readAll.mutateAsync();
      toast.add({ title: marked === 1 ? "1 memory marked as read." : `${marked} memories marked as read.`, type: "success" });
    } catch {
      toast.add({ title: "Couldn't mark them as read. Try again.", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader
        title="Inbox"
        description="What you saved to read or watch. Open one, or mark it read, and it leaves; Remind me brings it back later."
        action={
          items.length > 0 ? (
            <div className="flex items-center gap-2">
              {tab === "unread" && (
                <Button variant="ghost" size="sm" loading={readAll.isPending} onClick={markAllRead}>
                  Mark all as read
                </Button>
              )}
              <SelectButton selection={selection} />
            </div>
          ) : undefined
        }
      />

      <SegmentedControl
        label="Inbox view"
        value={tab}
        onValueChange={(value) => {
          selection.clear();
          setTab(value as Tab);
        }}
        options={[
          { value: "unread", label: "Unread", accessory: counts?.unread ? <Count n={counts.unread} /> : undefined },
          { value: "snoozed", label: "Snoozed", accessory: counts?.snoozed ? <Count n={counts.snoozed} /> : undefined },
        ]}
      />

      {query.isError ? (
        <QueryErrorState onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        tab === "unread" ? (
          <EmptyState
            title="You're all caught up"
            description={
              counts?.snoozed
                ? `Nothing unread. ${counts.snoozed} ${counts.snoozed === 1 ? "memory is" : "memories are"} waiting on a reminder.`
                : "Links, videos, documents and pictures you save land here until you've looked at them."
            }
          />
        ) : (
          <EmptyState title="Nothing snoozed" description="Use Remind me on anything to bring it back at a better time." />
        )
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{group.label}</h2>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <InboxRow
                    key={item.id}
                    item={item}
                    tab={tab}
                    selection={selection}
                    onRead={() => void markRead.mark([item], true)}
                    onRemind={() => void remindMe.remind([item])}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <MemorySelectionBar selection={selection} memories={items} context="inbox" />
      {remindMe.element}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-primary/12 px-1.5 text-[11px] font-semibold tabular-nums text-primary">{n > 99 ? "99+" : n}</span>;
}

function InboxRow({
  item,
  tab,
  selection,
  onRead,
  onRemind,
}: {
  item: Memory;
  tab: Tab;
  selection: Selection;
  onRead: () => void;
  onRemind: () => void;
}) {
  const TypeIcon = MEMORY_TYPE_ICONS[item.type];
  const selected = selection.has(item.id);
  const when =
    tab === "snoozed" && item.remindAt
      ? `Back ${formatRemindAt(item.remindAt)}`
      : item.remindedAt
        ? `Reminder · ${timeAgo(item.remindedAt)}`
        : timeAgo(item.createdAt);

  return (
    <li className="group/inbox relative">
      <Link
        href={`/app/memories/${item.id}`}
        {...selectableProps(selection.isSelecting, (e) => selection.toggle(item.id, e), { id: item.id, title: item.title, selected })}
        className={cn(
          "flex items-center gap-3 rounded-xl px-2 py-2 pr-24 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          selected && "bg-primary/10 hover:bg-primary/10",
        )}
      >
        <RowSelect checked={selected} selecting={selection.isSelecting} onToggle={(e) => selection.toggle(item.id, e)} label={`Select ${item.title}`} className="shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            <SiteIcon src={item.faviconUrl} fallback={TypeIcon} />
          </div>
        </RowSelect>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {tab === "unread" && <span aria-label="Unread" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
            {item.title}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">{item.description || item.source || item.url}</p>
        </div>
        <span className={cn("shrink-0 text-xs tabular-nums text-muted-foreground transition-opacity", !selection.isSelecting && "group-hover/inbox:opacity-0 group-focus-within/inbox:opacity-0")}>
          {when}
        </span>
      </Link>
      {/* Beside the link, not inside it: a press here never opens the memory. */}
      {!selection.isSelecting && (
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/inbox:opacity-100 group-focus-within/inbox:opacity-100">
          {tab === "unread" && (
            <RowButton label="Mark as read" onClick={onRead} icon={Done} />
          )}
          <RowButton label={tab === "snoozed" ? "Change reminder" : "Remind me"} onClick={onRemind} icon={Alarm} />
        </div>
      )}
    </li>
  );
}

function RowButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: typeof InboxIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-popover text-muted-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="h-4 w-4" />
    </button>
  );
}
