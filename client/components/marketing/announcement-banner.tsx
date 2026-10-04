"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { StickyBanner } from "@/components/ui/sticky-banner";
import { CountdownTiles } from "@/components/ui/countdown-tiles";
import { cn } from "@/lib/utils";
import { getActiveAnnouncement } from "@/lib/announcements";

function dismissedKey(id: string) {
  return `announcement-dismissed-${id}`;
}

export function AnnouncementBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const { data } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: getActiveAnnouncement,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  React.useEffect(() => {
    // Must start false on both server and first client render (mount flag
    // avoids a hydration mismatch); flipped true only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!data) return;
    // Reads localStorage (an external system) once the announcement to
    // check dismissal for is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(window.localStorage.getItem(dismissedKey(data.id)) === "1");
  }, [data]);

  if (!mounted || !data || dismissed) return null;

  const handleClose = () => {
    window.localStorage.setItem(dismissedKey(data.id), "1");
    setDismissed(true);
  };

  return (
    <StickyBanner
      key={data.id}
      hideOnScroll
      onClose={handleClose}
      className="bg-gradient-to-r from-primary to-blue-600 text-white"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 pr-8 text-center text-xs sm:text-sm">
        <span className="font-semibold">{data.title}</span>
        <span className="opacity-90">{data.message}</span>
        {data.targetDate && <CountdownTiles targetDate={data.targetDate} size="sm" />}
        {data.ctaLabel && data.ctaUrl && (
          <Link
            href={data.ctaUrl}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-6 rounded-full bg-white/15 px-3 text-xs font-medium text-white hover:bg-white/25"
            )}
          >
            {data.ctaLabel}
          </Link>
        )}
      </div>
    </StickyBanner>
  );
}
