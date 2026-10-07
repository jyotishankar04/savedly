import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Savedly",
  description: "Read our latest thoughts, updates, and deep dives on personal memory, search, and local-first software.",
  alternates: { canonical: "/blog" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
