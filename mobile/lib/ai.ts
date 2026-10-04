import { fetch as expoFetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { apiFetch, ACCESS_TOKEN_KEY, refreshAccessToken } from "./api";

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export async function createThread(title?: string): Promise<Thread> {
  const data = await apiFetch<Thread>("/ai/threads", {
    method: "POST",
    body: { title: title ?? "New Chat" },
  });
  return data;
}

export async function listThreads(): Promise<Thread[]> {
  const data = await apiFetch<Thread[]>("/ai/threads");
  return data;
}

export async function getThreadMessages(threadId: string): Promise<any[]> {
  const data = await apiFetch<any[]>(`/ai/threads/${threadId}/messages`);
  return data;
}

export function askStreamUrl(threadId: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:4000/api/v1";
  return `${baseUrl}/ai/threads/${threadId}/ask`;
}

/**
 * A fetch-compatible function for DefaultChatTransport (ai SDK). Two things
 * the plain fetch/token-in-header approach in ask.tsx got wrong:
 *
 * 1. React Native's built-in fetch doesn't reliably support a streaming
 *    response body — `response.body` needs to be a real, incrementally
 *    readable ReadableStream for the ai SDK to render tokens as they arrive.
 *    expo/fetch is Expo's own fetch implementation built for exactly this.
 *
 * 2. Reading the access token once into React state on mount and hardcoding
 *    it into every request's header means every ask after the token expires
 *    (15m TTL) fails with 401 forever — apiFetch's axios interceptor
 *    refreshes-and-retries automatically, but a raw fetch call doesn't get
 *    that for free. This re-reads the token fresh on every call and, on a
 *    401, runs the same shared refresh (lib/api.ts's refreshAccessToken)
 *    and retries once — same behavior as apiFetch, just fetch-shaped.
 */
export async function authenticatedStreamFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return expoFetch(input.toString(), { ...init, headers: headers as unknown as HeadersInit }) as unknown as Promise<Response>;
  };

  const response = await attempt();
  if (response.status !== 401) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  return attempt();
}
