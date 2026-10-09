"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

/**
 * Back from Google's consent screen (`?calendar=connected` or `error`): says
 * how it went, reloads the connection so the card shows it at once, and
 * tidies the address. Renders nothing.
 */
export function CalendarConnectResult() {
  const result = useSearchParams().get("calendar");
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!result) return;
    if (result === "connected") toast.add({ title: "Google Calendar connected", type: "success" });
    else toast.add({ title: "Google Calendar wasn't connected", description: "Nothing was changed. You can try again.", type: "error" });
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
    router.replace("/app/integrations");
  }, [result, queryClient, router]);

  return null;
}
