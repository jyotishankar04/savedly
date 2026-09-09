import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type AuthUser, getCurrentUser, hasStoredSession, logout as apiLogout, storeTokens } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** Called from the deep-link callback screen once tokens land. */
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const hasSession = await hasStoredSession();
      if (!hasSession) {
        setUser(null);
        return;
      }
      const current = await getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refetch();
      setIsLoading(false);
    })();
  }, [refetch]);

  const signIn = useCallback(
    async (accessToken: string, refreshToken: string) => {
      await storeTokens(accessToken, refreshToken);
      await refetch();
    },
    [refetch],
  );

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, refetch }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
