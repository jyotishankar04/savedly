import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCalendarEvent,
  deleteCalendarEventForMemory,
  deleteExternalCalendarEvent,
  disconnectCalendar,
  getCalendarConnections,
  listCalendarEvents,
  pushMemoryToCalendar,
  updateCalendarEventForMemory,
  updateExternalCalendarEvent,
  type CalendarProviderKey,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from "@/lib/calendar-api";

export const calendarKeys = {
  connections: ["calendar", "connections"] as const,
  events: (from: string, to: string) => ["calendar", "events", from, to] as const,
};

export const useCalendarConnectionsQuery = () =>
  useQuery({ queryKey: calendarKeys.connections, queryFn: getCalendarConnections });

export function useDisconnectCalendarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: CalendarProviderKey) => disconnectCalendar(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.connections });
      // The merged event list embeds that provider's own events (fetched
      // live from its API) for every range already in the cache — those
      // stay stale until refetched, so a just-disconnected calendar would
      // otherwise keep showing its events until an unrelated remount.
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

export function usePushToCalendarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memoryId, provider }: { memoryId: string; provider: CalendarProviderKey }) =>
      pushMemoryToCalendar(memoryId, provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar", "events"] }),
  });
}

export const useCalendarEventsQuery = (range: { from: string; to: string }) =>
  useQuery({
    queryKey: calendarKeys.events(range.from, range.to),
    queryFn: () => listCalendarEvents(range.from, range.to),
    enabled: Boolean(range.from && range.to),
    // Paging to the next week keeps the last week's events on screen until the new ones arrive, instead of blanking the grid.
    placeholderData: keepPreviousData,
  });

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => createCalendarEvent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar", "events"] }),
  });
}

/** Which API an edit/delete goes through — a memora-backed event (the vast majority) vs. a purely external one with no Memora memory at all. */
export type EventEditTarget =
  | { kind: "memory"; memoryId: string }
  | { kind: "external"; provider: CalendarProviderKey; externalEventId: string };

export function useUpdateCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, input }: { target: EventEditTarget; input: UpdateCalendarEventInput }) => {
      if (target.kind === "memory") return updateCalendarEventForMemory(target.memoryId, input);
      if (!input.title || !input.startAt) {
        // The external-event API has no memory to fall back on for these,
        // unlike the memory-backed path — both are always required there.
        return Promise.reject(new Error("Title and date are required to update this event."));
      }
      return updateExternalCalendarEvent(target.provider, target.externalEventId, {
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        durationMinutes: input.durationMinutes,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar", "events"] }),
  });
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: EventEditTarget) =>
      target.kind === "memory" ? deleteCalendarEventForMemory(target.memoryId) : deleteExternalCalendarEvent(target.provider, target.externalEventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar", "events"] }),
  });
}
