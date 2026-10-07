import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Savedly",
  description: "Explore the capabilities of Savedly: automatic enrichment, hybrid search, the Ask assistant, private vault, and calendar sync.",
  alternates: { canonical: "/features" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
