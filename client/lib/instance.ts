/**
 * True in the Docker image people run themselves (client/Dockerfile sets
 * NEXT_PUBLIC_SELF_HOSTED at build time), false on the hosted service.
 *
 * A self-hosted install is its operator's own tool, not a place to sell the
 * product: it has no landing, pricing or comparison pages, and opens on
 * sign-in. A build-time constant, so pages render the right version on the
 * first paint instead of switching after the server's config loads.
 */
export const SELF_HOSTED = process.env.NEXT_PUBLIC_SELF_HOSTED === "true";

/**
 * A link to a page a self-hosted install doesn't have (contact, pricing): on
 * such an install it goes to the hosted site, where that page lives.
 */
export function hostedHref(path: string): string {
  return SELF_HOSTED ? `https://savedly.app${path}` : path;
}
