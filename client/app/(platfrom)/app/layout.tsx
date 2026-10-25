"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MaintenanceFullPage } from "@/components/maintenance/maintenance-full-page";
import { FORCED_MAINTENANCE_MESSAGE, FORCED_MAINTENANCE, getMaintenanceStatus } from "@/lib/maintenance";
import { UserProvider, useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { LogoMark } from "@/components/logo";
import { AppShell } from "@/components/app-shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Maintenance gate takes priority over the auth gate below — /app is
  // fully hidden while maintenance is on (admins manage it from /admin
  // instead, which this layout doesn't cover). Polls so it recovers on its
  // own once an admin turns maintenance back off, no reload needed.
  const { data: maintenance } = useQuery({
    queryKey: ["maintenance", "status"],
    queryFn: getMaintenanceStatus,
    staleTime: 60 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });

  // Auth gate: the access token lives in an httpOnly cookie the backend set,
  // so this client can't check for it locally — it asks /auth/me instead.
  // Redirects to login if that fails, or to /onboard if the signed-in user
  // hasn't finished the onboarding questionnaire yet (covers direct
  // navigation to /app, not just the post-OAuth-login redirect).
  const { data: currentUser, isLoading, isError } = useCurrentUserQuery();
  const setCurrentUser = useSetCurrentUser();
  const needsOnboarding = Boolean(currentUser && !currentUser.onboardingCompleted);

  useEffect(() => {
    // The backend is down: stay here on the maintenance page rather than bounce to sign-in.
    if (isLoading || FORCED_MAINTENANCE) return;
    if (isError) {
      router.replace("/auth/login");
    } else if (needsOnboarding) {
      router.replace("/onboard");
    }
  }, [isLoading, isError, needsOnboarding, router]);

  if (FORCED_MAINTENANCE) return <MaintenanceFullPage message={FORCED_MAINTENANCE_MESSAGE} />;
  if (maintenance?.enabled) {
    return <MaintenanceFullPage message={maintenance.message} />;
  }

  if (isLoading || isError || !currentUser || needsOnboarding) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LogoMark className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  return (
    <UserProvider user={currentUser} setUser={setCurrentUser}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
