"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConstructionIcon as Construction } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getMaintenanceStatus } from "@/lib/maintenance";

const SEEN_KEY = "maintenance-modal-seen";

export function MaintenanceModal() {
  const [open, setOpen] = React.useState(false);

  const { data } = useQuery({
    queryKey: ["maintenance", "status"],
    queryFn: getMaintenanceStatus,
    staleTime: 60 * 1000,
    retry: 1,
  });

  React.useEffect(() => {
    if (!data?.enabled) return;
    if (window.sessionStorage.getItem(SEEN_KEY) === "1") return;
    // Opens in response to the maintenance-status query resolving (an
    // external system) and sessionStorage (another one) — not derivable
    // from render inputs alone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [data?.enabled]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) window.sessionStorage.setItem(SEEN_KEY, "1");
  };

  if (!data?.enabled) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="relative w-12 h-12 flex items-center justify-center mb-2">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
            <div className="w-10 h-10 rounded-xl border border-primary/30 flex items-center justify-center bg-card shadow-sm">
              <HugeiconsIcon icon={Construction} strokeWidth={2.25} className="h-5 w-5 text-primary" />
            </div>
          </div>
          <DialogTitle>We&apos;re under maintenance</DialogTitle>
          <DialogDescription>{data.message}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
