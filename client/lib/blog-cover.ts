// Server-only: used by the blog's pages while they render.

/**
 * Whether a cover image actually loads. A page shows a picture as it is,
 * so a cover on another host that won't load is left out rather than shown
 * broken. The answer is cached for five minutes, and a slow host counts as
 * broken.
 */
export async function coverLoads(url: string): Promise<boolean> {
  // A file on this site (a path like /landing/x.webp) is part of the build, so it's there.
  if (url.startsWith("/")) return true;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2500), next: { revalidate: 300 } });
    return response.ok && (response.headers.get("content-type") ?? "image/").startsWith("image/");
  } catch {
    return false;
  }
}
