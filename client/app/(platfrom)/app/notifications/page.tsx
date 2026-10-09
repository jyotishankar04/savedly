"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BellIcon as Bell,
  UserLockIcon as UserLock,
  CheckmarkCircle02Icon as Approved,
  CancelCircleIcon as Declined,
  Share02Icon as Shared,
  Delete02Icon as Trash,
  Calendar03Icon as CalendarIcon,
  Copy01Icon as Copy,
  Tick02Icon as Tick,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { Reveal } from "@/components/ui/reveal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { accessRequestRefs, eventDetectedRefs, type AppNotification, type NotificationType } from "@/lib/notifications";
import {
  useDeleteNotificationMutation,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotificationsQuery,
} from "@/hooks/use-notifications";
import { useApproveRequestMutation, useDenyRequestMutation, usePendingRequestsQuery } from "@/hooks/use-shares";
import { EventDetectedPopup } from "@/components/memory/event-detected-popup";
import { InlineDuplicateAction } from "@/components/memory/duplicate-dialog";

const ICONS: Record<NotificationType, typeof Bell> = {
  share_invite_received: Shared,
  share_access_requested: UserLock,
  share_access_approved: Approved,
  share_access_denied: Declined,
  share_revoked: Declined,
  event_detected: CalendarIcon,
  duplicate_detected: Copy,
};

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError, refetch } = useNotificationsQuery("all");
  const markAllRead = useMarkAllReadMutation();

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <QueryErrorState title="Couldn't load your notifications" onRetry={() => refetch()} />
      </div>
    );
  }

  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;
  const groups = groupByRecency(notifications ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate(undefined as never)}
            className="h-9 rounded-full px-4 text-sm font-medium"
          >
            <HugeiconsIcon icon={Tick} strokeWidth={2.25} className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{group.label}</h2>
              <ul className="space-y-2.5">
                {group.items.map((notification, index) => (
                  <Reveal key={notification.id} index={Math.min(index, 8)}>
                    <NotificationRow notification={notification} />
                  </Reveal>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Today / This week / Earlier, keeping the server's newest-first order inside each group. */
function groupByRecency(items: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const buckets: Record<string, AppNotification[]> = { Today: [], "This week": [], Earlier: [] };
  for (const n of items) {
    const age = now - new Date(n.createdAt).getTime();
    (age < DAY ? buckets.Today : age < 7 * DAY ? buckets["This week"] : buckets.Earlier).push(n);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

const TYPE_LABEL: Record<NotificationType, string> = {
  share_invite_received: "Shared with you",
  share_access_requested: "Access request",
  share_access_approved: "Access approved",
  share_access_denied: "Access declined",
  share_revoked: "Access removed",
  event_detected: "Event detected",
  duplicate_detected: "Duplicate detected",
};

function NotificationRow({ notification }: { notification: AppNotification }) {
  const markRead = useMarkReadMutation();
  const remove = useDeleteNotificationMutation();
  const Icon = ICONS[notification.type] ?? Bell;
  const unread = !notification.readAt;
  const hasActions =
    notification.type === "share_access_requested" || notification.type === "event_detected" || notification.type === "duplicate_detected";

  const body = (
    <div className="min-w-0 space-y-1">
      <p className={cn("text-[15px] leading-snug", unread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
        {notification.title}
      </p>
      {notification.body && <p className="text-sm leading-snug text-muted-foreground">{notification.body}</p>}
      <p className="text-xs text-muted-foreground/80">
        {TYPE_LABEL[notification.type] ?? "Notification"} · {timeAgo(notification.createdAt)}
      </p>
    </div>
  );

  return (
    <li
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border p-4 transition-colors",
        unread ? "border-primary/25 bg-primary/[0.035]" : "border-border bg-card/40 hover:bg-card/70",
      )}
    >
      {/* Unread marker: a dot, not a coloured edge. */}
      {unread && <span aria-label="Unread" className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />}

      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={Icon} strokeWidth={2} className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1 space-y-3">
        {/* Only link when there's somewhere useful to go — a declined request has no destination. */}
        {notification.actionUrl ? (
          <Link href={notification.actionUrl} onClick={() => unread && markRead.mutate(notification.id)} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
            {body}
          </Link>
        ) : (
          body
        )}

        {(hasActions || unread) && (
          <div className="flex flex-wrap items-center gap-2">
            {notification.type === "share_access_requested" && <InlineDecision notification={notification} />}
            {notification.type === "event_detected" && <InlineCalendarAction notification={notification} />}
            {notification.type === "duplicate_detected" && <InlineDuplicateAction notification={notification} />}
            {/* On phones "Mark read" joins the actions; beside the title it would squeeze the text. */}
            {unread && (
              <button
                type="button"
                onClick={() => markRead.mutate(notification.id)}
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:hidden"
              >
                Mark read
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-start">
        {unread && (
          <button
            type="button"
            onClick={() => markRead.mutate(notification.id)}
            className="hidden rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:inline-flex"
          >
            Mark read
          </button>
        )}
        <button
          type="button"
          aria-label="Delete notification"
          onClick={() => remove.mutate(notification.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
        >
          <HugeiconsIcon icon={Trash} strokeWidth={2} className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/**
 * Approve or decline straight from the notification.
 *
 * The alternative — sending the owner off to find the right collection's
 * share dialog — is how this feature stays unused. The ids come from the
 * notification's metadata, and the buttons disappear once the request is
 * no longer pending (approved elsewhere, withdrawn by the requester).
 */
function InlineDecision({ notification }: { notification: AppNotification }) {
  const refs = accessRequestRefs(notification);
  const { data: pending = [] } = usePendingRequestsQuery();
  const approve = useApproveRequestMutation();
  const deny = useDenyRequestMutation();
  const markRead = useMarkReadMutation();

  if (!refs) return null;

  const stillPending = pending.some((request) => request.id === refs.requestId);
  if (!stillPending) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Approved} strokeWidth={2} className="h-4 w-4" />
        Handled
      </span>
    );
  }

  const busy = approve.isPending || deny.isPending;

  async function decide(action: "approve" | "deny") {
    const mutation = action === "approve" ? approve : deny;
    try {
      await mutation.mutateAsync({ id: refs!.shareId, requestId: refs!.requestId });
      if (!notification.readAt) markRead.mutate(notification.id);
      toast.add({ title: action === "approve" ? "Access granted" : "Request declined", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update that request.", type: "error" });
    }
  }

  return (
    <>
      <Button disabled={busy} onClick={() => decide("approve")} className="h-9 rounded-full px-5 text-sm font-medium">
        Approve
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => decide("deny")} className="h-9 rounded-full px-5 text-sm font-medium">
        Decline
      </Button>
    </>
  );
}

/** Same "act inline" pattern as InlineDecision above, but for an AI-detected event — opens the shared confirm-then-commit popup rather than acting directly. */
function InlineCalendarAction({ notification }: { notification: AppNotification }) {
  const refs = eventDetectedRefs(notification);
  const [open, setOpen] = React.useState(false);
  const remove = useDeleteNotificationMutation();

  if (!refs) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-9 rounded-full px-5 text-sm font-medium">
        <HugeiconsIcon icon={CalendarIcon} strokeWidth={2} className="h-4 w-4" />
        Add to calendar
      </Button>
      {/* Dismissing a suggestion removes it; marking it read would leave the same buttons on screen. */}
      <Button
        variant="ghost"
        disabled={remove.isPending}
        onClick={() => remove.mutate(notification.id)}
        className="h-9 rounded-full px-4 text-sm font-medium text-muted-foreground"
      >
        Dismiss
      </Button>
      {open && <EventDetectedPopup notification={notification} onClose={() => setOpen(false)} />}
    </>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-sm space-y-3 py-20 text-center">
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-card shadow-md">
          <HugeiconsIcon icon={Bell} strokeWidth={2.25} className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">Nothing here yet</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Access requests, shares, and events we spot in your memories will show up here.
      </p>
    </div>
  );
}
