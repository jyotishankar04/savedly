import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — SaveForLatter",
  description: "Explore the capabilities of SaveForLatter: automatic enrichment, hybrid search, the Ask assistant, private vault, and calendar sync.",
  alternates: { canonical: "/features" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
