import { apiFetch } from "@/lib/auth";

/** What kind of server this client is talking to — decided at runtime, so one client build serves hosted and self-hosted. */
export interface ServerConfig {
  selfHosted: boolean;
  /** Paid plans can be bought (hosted, with a payment provider configured). */
  billing: boolean;
  /**
   * New Google Calendar connections are open. False while an admin has them
   * switched off (the hosted service does, during Google's review of its
   * calendar access); existing connections keep working either way.
   */
  googleCalendar: boolean;
  /** False on a self-hosted install whose admin hasn't connected AI yet. */
  aiReady: boolean;
  /** GitHub stars can be connected: GitHub sign-in is set up on the server and the integration isn't switched off. */
  githubStars: boolean;
}

export function getServerConfig(): Promise<ServerConfig> {
  return apiFetch<ServerConfig>("/config");
}
