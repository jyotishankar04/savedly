import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: "unread" | "all") => ["notifications", "list", status] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export const useNotificationsQuery = (status: "unread" | "all" = "all") =>
  useQuery({ queryKey: notificationKeys.list(status), queryFn: () => listNotifications(status) });

/**
 * Drives the bell badge, so it's mounted on every authenticated page.
 * Polled rather than pushed — there's no websocket in this app, and a
 * minute of latency on "someone asked for access" is acceptable. Cheap
 * enough that it isn't worth building a socket for.
 */
export const useUnreadCountQuery = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: pollInterval,
    staleTime: 3_000,
  });

function useNotificationMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Both the list and the badge change on every one of these.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export const useMarkReadMutation = () => useNotificationMutation(markNotificationRead);
export const useMarkAllReadMutation = () => useNotificationMutation(() => markAllNotificationsRead());
export const useDeleteNotificationMutation = () => useNotificationMutation(deleteNotification);

// Right after a save, its "is this an event?" notice arrives within seconds
// (ingestion takes ~10-30s), so notifications are checked every few seconds
// for a short while instead of waiting for the minute-long poll.
const FAST_POLL_MS = 5_000;
const FAST_WINDOW_MS = 2 * 60_000;
let fastUntil = 0;

/** Call after saving (or re-processing) a memory: checks notifications often for the next two minutes. */
export function expectNotificationsSoon(): void {
  fastUntil = Date.now() + FAST_WINDOW_MS;
}

const pollInterval = () => (Date.now() < fastUntil ? FAST_POLL_MS : 60_000);

/**
 * Feeds AppShell's live "want to add this to your calendar?" popup. No
 * websocket in this app: polled once a minute, and every few seconds just
 * after a save (expectNotificationsSoon), so a detected event pops up while
 * the user is still around.
 */
export const useRecentEventNotificationsQuery = () =>
  useQuery({
    queryKey: notificationKeys.list("unread"),
    queryFn: () => listNotifications("unread"),
    refetchInterval: pollInterval,
    staleTime: 3_000,
  });
