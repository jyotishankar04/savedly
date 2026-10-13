import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog · Savedly",
  description: "Notes from building Savedly: how it works, what changed, and what we learned along the way.",
  alternates: { canonical: "/blog" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
