import type { MetadataRoute } from "next";

// Makes the site installable to a phone's home screen, where it opens
// full-screen without browser chrome. Installed on Android, it also appears
// in the system share sheet: sharing a link from any app opens the capture
// page with it filled in (see the share handling in app/capture/page.tsx).
// iOS installs it too, but has no share target for web apps.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "SaveForLatter",
    short_name: "SaveForLatter",
    description: "Save links, notes, videos and screenshots, and find them again later.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Apps send the link as `url`, or (YouTube and most others) inside `text`.
    share_target: {
      action: "/app/capture",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    shortcuts: [
      { name: "Capture", short_name: "Capture", url: "/app/capture", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Search", short_name: "Search", url: "/app/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
