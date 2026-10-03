import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// Help Center guides moved from /help/<slug> into the Fumadocs docs space.
// Old links (and anything already indexed) keep working.
const GUIDE_REDIRECTS: [string, string][] = [
  ["getting-started", "get-started/getting-started"],
  ["capture", "get-started/capture"],
  ["import", "get-started/import"],
  ["extension", "get-started/extension"],
  ["organize", "find/organize"],
  ["search", "find/search"],
  ["library", "find/library"],
  ["explore", "find/explore"],
  ["ask", "ai/ask"],
  ["ai-setup", "self-host/ai-setup"],
  ["self-host", "self-host/self-host"],
  ["share", "share/share"],
  ["vault", "share/vault"],
  ["calendar", "stay/calendar"],
  ["notifications", "stay/notifications"],
  ["shortcuts", "account/shortcuts"],
  ["account", "account/account"],
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (client/Dockerfile sets
  // NEXT_OUTPUT=standalone). Left unset for the hosted Netlify build.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async redirects() {
    return [
      { source: "/open-source", destination: "/contribute", permanent: true },
      ...GUIDE_REDIRECTS.map(([from, to]) => ({
        source: `/help/${from}`,
        destination: `/help/docs/${to}`,
        permanent: true,
      })),
    ];
  },
};

export default withMDX(nextConfig);
