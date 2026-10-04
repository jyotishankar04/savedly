import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — SaveForLatter",
  description: "See what's new in SaveForLatter. New features, improvements, and bug fixes.",
  alternates: { canonical: "/changelog" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
