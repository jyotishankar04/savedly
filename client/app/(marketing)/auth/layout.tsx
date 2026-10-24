"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MaintenanceFullPage } from "@/components/maintenance/maintenance-full-page";
import { FORCED_MAINTENANCE, FORCED_MAINTENANCE_MESSAGE, getMaintenanceStatus } from "@/lib/maintenance";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /auth/login stays functional during maintenance — it's the only way an
  // admin whose session has expired can sign back in and turn it off.
  const isLoginPage = pathname === "/auth/login";

  const { data: maintenance } = useQuery({
    queryKey: ["maintenance", "status"],
    queryFn: getMaintenanceStatus,
    staleTime: 60 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
    enabled: !isLoginPage,
  });

  // Switched on in the website (the backend is down): nobody can sign in, so sign-in shows it too.
  if (FORCED_MAINTENANCE) return <MaintenanceFullPage message={FORCED_MAINTENANCE_MESSAGE} />;

  if (!isLoginPage && maintenance?.enabled) {
    return <MaintenanceFullPage message={maintenance.message} />;
  }

  return <>{children}</>;
}
