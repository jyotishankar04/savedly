"use client";

import React, { createContext, useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getCurrentUser, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SHOWCASE_MODE } from "@/lib/showcase";

export const currentUserQueryKey = ["auth", "me"] as const;

/**
 * Fetches the signed-in user via /auth/me. Transient failures (dev server
 * mid-restart, a dropped connection) look identical to "not logged in" from
 * a single failed request — only a real 401 means the session is actually
 * invalid, so those get a few retries before the caller should treat this
 * as a logout.
 */
export function useCurrentUserQuery() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    // In showcase mode there's no backend to reconnect to at all, so retrying
    // just stalls the nav in its loading state for no benefit — fail once
    // and settle straight into the signed-out UI.
    retry: SHOWCASE_MODE
      ? false
      : (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 3,
    retryDelay: 800,
    staleTime: 60_000,
  });
}

/** Updates the cached current-user record in place (e.g. after a profile edit), without a refetch. */
export function useSetCurrentUser() {
  const queryClient = useQueryClient();
  return (user: AuthUser) => queryClient.setQueryData(currentUserQueryKey, user);
}

interface UserContextValue {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  user,
  setUser,
  children,
}: {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

/** Signed-in user for the /app section. Only usable inside the (platfrom)/app layout, which is the only place that fetches and provides it. */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser() must be used within the /app layout's UserProvider");
  }
  return ctx;
}

export function getInitials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Formats an RBAC role for display.
 *
 * This is NOT the billing plan, despite what it used to be called. Roles
 * (`user`, `admin`) grant permissions; plans (Free/Plus/Pro) grant
 * entitlements, and only `plans` is ever enforced for the latter. Use
 * `usePlanLabel()` for anything a user sees about what they're paying for.
 */
export function formatRole(roles: string[]): string {
  const primary = roles[0] ?? "user";
  return primary.replace(/_/g, " ").toUpperCase();
}

export function UserAvatar({ user, className }: { user: AuthUser; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (user.avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain avatar image
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold select-none", className)}>
      {getInitials(user.name, user.email)}
    </div>
  );
}
