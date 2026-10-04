"use client";

import dynamic from "next/dynamic";

// FullCalendar measures the DOM as it lays out, so it only renders in the browser.
const CalendarView = dynamic(() => import("@/components/calendar/calendar-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col gap-4" aria-busy="true" aria-label="Loading calendar">
      <div className="h-9 w-72 max-w-full animate-pulse rounded-full bg-foreground/5" />
      <div className="min-h-0 flex-1 animate-pulse rounded-3xl bg-foreground/[0.035] ring-1 ring-foreground/8" />
    </div>
  ),
});

export default function CalendarPage() {
  return (
    <div className="mx-auto h-[max(34rem,calc(100dvh-8.5rem))] max-w-7xl px-4 py-4 sm:px-6 md:h-[max(36rem,calc(100dvh-4rem))] md:py-6">
      <CalendarView />
    </div>
  );
}
