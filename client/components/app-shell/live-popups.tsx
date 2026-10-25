"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRecentEventNotificationsQuery } from "@/hooks/use-notifications";
import type { AppNotification } from "@/lib/notifications";
import { LiveEventDetectedPopup } from "@/components/memory/event-detected-popup";
import { LiveDuplicatePopup, wasDuplicatePopupDismissed } from "@/components/memory/duplicate-dialog";

/**
 * Live "want to add this to your calendar?" popup — surfaces a detected
 * event immediately if the user happens to be on the site when ingestion
 * finishes, rather than waiting for them to visit /app/notifications.
 * Rides the same 60s poll as the bell badge (no websocket in this app);
 * the email sent alongside this notification already covers the case
 * where the user isn't around to see it live. The same, for a duplicate
 * found in something saved elsewhere (the extension, a share from a phone)
 * while this tab is open.
 */
export function LivePopups() {
  const { data: recentNotifications } = useRecentEventNotificationsQuery();
  const seenEventPopupIds = useRef<Set<string>>(new Set());
  const [eventPopupNotification, setEventPopupNotification] = useState<AppNotification | null>(null);
  const [duplicatePopup, setDuplicatePopup] = useState<AppNotification | null>(null);
  useEffect(() => {
    if (duplicatePopup || eventPopupNotification) return;
    const next = recentNotifications?.find(
      (n) => n.type === "duplicate_detected" && !seenEventPopupIds.current.has(n.id) && !wasDuplicatePopupDismissed(n.id),
    );
    if (next) {
      seenEventPopupIds.current.add(next.id);
      setDuplicatePopup(next);
    }
  }, [recentNotifications, duplicatePopup, eventPopupNotification]);

  useEffect(() => {
    if (eventPopupNotification) return;
    const next = recentNotifications?.find(
      (n) => n.type === "event_detected" && !seenEventPopupIds.current.has(n.id),
    );
    if (next) {
      seenEventPopupIds.current.add(next.id);
      setEventPopupNotification(next);
    }
  }, [recentNotifications, eventPopupNotification]);

  return (
    <>
      {eventPopupNotification && (
        <LiveEventDetectedPopup
          notification={eventPopupNotification}
          onClose={() => setEventPopupNotification(null)}
        />
      )}

      {duplicatePopup && <LiveDuplicatePopup notification={duplicatePopup} onClose={() => setDuplicatePopup(null)} />}
    </>
  );
}
