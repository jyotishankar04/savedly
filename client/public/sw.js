// SaveForLatter's service worker. It does one job: receive what another app
// shares to the installed app (the manifest's share_target), which arrives as
// a form POST that only a service worker can read on a static site.
//
// It deliberately caches nothing else. No pages and no API responses are
// stored, so it can never serve a stale app or someone's private data.

const SHARE_PATH = "/share-target";
const SHARE_CACHE = "share-target";
// Where the capture page picks the shared file up (see app/capture/page.tsx).
const SHARED_FILE_URL = "/__shared-file";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === SHARE_PATH) {
    event.respondWith(receiveShare(event.request));
  }
});

async function receiveShare(request) {
  const params = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const key of ["title", "text", "url"]) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    // The capture form holds one attachment, so the first file is kept.
    const file = form.getAll("files").find((entry) => entry instanceof File && entry.size > 0);
    const cache = await caches.open(SHARE_CACHE);
    await cache.delete(SHARED_FILE_URL);
    if (file) {
      await cache.put(
        SHARED_FILE_URL,
        new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name || "shared-file"),
          },
        }),
      );
      params.set("shared-file", "1");
    }
  } catch {
    // An unreadable share still opens the capture page, just empty.
  }
  const query = params.toString();
  return Response.redirect(`/app/capture${query ? `?${query}` : ""}`, 303);
}
