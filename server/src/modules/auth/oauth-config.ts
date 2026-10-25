import { getSection } from "../../platform/instance-settings/instance-settings.service";

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Google/GitHub client credentials: env in hosted production, env or Admin -> Infrastructure when
 * self-hosted. Null when not set up, which hides the sign-in button.
 */
export async function getOAuthCredentials(provider: "google" | "github"): Promise<OAuthClientCredentials | null> {
  const section = await getSection(provider === "google" ? "googleAuth" : "githubAuth");
  const clientId = section.clientId ? String(section.clientId) : "";
  const clientSecret = section.clientSecret ? String(section.clientSecret) : "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export async function requireOAuthCredentials(provider: "google" | "github"): Promise<OAuthClientCredentials> {
  const credentials = await getOAuthCredentials(provider);
  if (!credentials) throw new Error(`${provider} sign-in isn't configured`);
  return credentials;
}
