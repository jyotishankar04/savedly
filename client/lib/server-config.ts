import { apiFetch } from "@/lib/auth";

/** What kind of server this client is talking to — decided at runtime, so one client build serves hosted and self-hosted. */
export interface ServerConfig {
  selfHosted: boolean;
  /** Paid plans can be bought (hosted, with a payment provider configured). */
  billing: boolean;
}

export function getServerConfig(): Promise<ServerConfig> {
  return apiFetch<ServerConfig>("/config");
}
