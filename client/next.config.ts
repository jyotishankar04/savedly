import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (client/Dockerfile sets
  // NEXT_OUTPUT=standalone). Left unset for the hosted Netlify build.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async redirects() {
    return [
      { source: "/pricing", destination: "/contribute", permanent: true },
      { source: "/open-source", destination: "/contribute", permanent: true },
    ];
  },
};

export default nextConfig;
