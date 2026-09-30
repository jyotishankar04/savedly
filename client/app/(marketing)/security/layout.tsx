import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Trust — SaveForLatter",
  description: "Learn how we encrypt your data, handle AI privacy, and protect your second brain.",
  alternates: { canonical: "/security" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
