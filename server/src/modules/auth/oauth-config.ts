import { getSection } from "../instance-settings/instance-settings.service";

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Google/GitHub OAuth client credentials — from env in hosted production, or
 * from env or Admin -> Infrastructure on a self-hosted install. Null when the
 * provider isn't set up, which hides its sign-in button.
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
