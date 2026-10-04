import * as SecureStore from "expo-secure-store";
import { API_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, apiFetch } from "./api";

export type OAuthProvider = "google" | "github";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  roles: string[];
  onboardingCompleted: boolean;
}

export interface ProvidersResponse {
  google: boolean;
  github: boolean;
  signupsEnabled: boolean;
}

/** Opened in an in-app browser (WebBrowser.openAuthSessionAsync) — the backend runs the whole OAuth round trip and redirects back to the app's deep link with tokens. */
export function getProviderLoginUrl(provider: OAuthProvider): string {
  return `${API_URL}/auth/${provider}?platform=mobile`;
}

export async function getProviders(): Promise<ProvidersResponse> {
  return apiFetch<ProvidersResponse>("/auth/providers");
}

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function hasStoredSession(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return Boolean(token);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>("/auth/me");
  return user;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    await apiFetch("/auth/logout", { method: "POST", body: refreshToken ? { refreshToken } : undefined });
  } catch {
    // best-effort — we still clear local tokens below regardless
  } finally {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
